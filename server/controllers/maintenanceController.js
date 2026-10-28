import { DataEngine } from '../models/dataEngine.js';
import { getDriverForUser, getDriverVehicles, isVehicleOwnedByDriver } from '../utils/driverHelper.js';

// @desc Get all maintenance records with filters & pagination
// @route GET /api/maintenance
export const getMaintenanceRecords = async (req, res, next) => {
  try {
    const { vehicle, status, maintenanceType, search, page = 1, limit = 10 } = req.query;

    let records = await DataEngine.find('maintenances', {}, {
      populate: 'vehicle'
    });

    // DRIVER ROLE ACCESS RESTRICTION:
    // Drivers only see maintenance records for their own vehicles
    if (req.user && req.user.role === 'driver') {
      const driverVehicles = await getDriverVehicles(req.user);
      const driverVehicleIds = driverVehicles.map(v => String(v._id || v.id));
      records = records.filter(m => {
        const vehId = String(m.vehicle?._id || m.vehicle || '');
        return driverVehicleIds.includes(vehId);
      });
    }

    if (vehicle && vehicle !== 'All') {
      records = records.filter(m => (m.vehicle?._id || m.vehicle) === vehicle);
    }

    if (status && status !== 'All') {
      records = records.filter(m => m.status === status);
    }

    if (maintenanceType && maintenanceType !== 'All') {
      records = records.filter(m => m.maintenanceType === maintenanceType);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      records = records.filter(m =>
        (m.maintenanceId && m.maintenanceId.toLowerCase().includes(q)) ||
        (m.vehicle?.registrationNumber && m.vehicle.registrationNumber.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.serviceCenter && m.serviceCenter.toLowerCase().includes(q))
      );
    }

    records.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

    // Summary calculations
    const totalCost = records.reduce((acc, m) => acc + (m.cost || 0), 0);
    const activeRepairs = records.filter(m => m.status === 'In Progress' || m.status === 'Scheduled').length;
    const completedServices = records.filter(m => m.status === 'Completed').length;

    // Check overdue and due soon
    const now = new Date();
    const fifteenDays = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    let overdueCount = 0;
    let dueSoonCount = 0;

    records.forEach(r => {
      if (r.nextServiceDate && r.status !== 'Completed') {
        const nextDate = new Date(r.nextServiceDate);
        if (nextDate < now) overdueCount++;
        else if (nextDate <= fifteenDays) dueSoonCount++;
      }
    });

    const totalRecords = records.length;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = records.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      summary: {
        totalCost,
        activeRepairs,
        completedServices,
        overdueCount,
        dueSoonCount
      },
      totalRecords,
      totalPages,
      currentPage: pageNum
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create maintenance record
// @route POST /api/maintenance
export const createMaintenanceRecord = async (req, res, next) => {
  try {
    let {
      vehicleId,
      maintenanceType,
      description,
      serviceDate,
      nextServiceDate,
      cost = 0,
      serviceCenter = 'Authorized Service Center',
      status = 'Scheduled',
      notes = ''
    } = req.body;

    // Handle driver self-maintenance logging
    if (req.user && req.user.role === 'driver') {
      const driverVehicles = await getDriverVehicles(req.user);
      if (!vehicleId && driverVehicles.length > 0) {
        vehicleId = driverVehicles[0]._id;
      }
      const isOwned = driverVehicles.some(v => String(v._id || v.id) === String(vehicleId));
      if (!isOwned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only schedule maintenance for your own vehicle.'
        });
      }
    }

    if (!serviceDate) {
      serviceDate = new Date().toISOString().split('T')[0];
    }
    if (!nextServiceDate) {
      nextServiceDate = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    }

    if (!vehicleId || !maintenanceType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, maintenance type, and description are required'
      });
    }

    const vehicle = await DataEngine.findById('vehicles', vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const count = await DataEngine.countDocuments('maintenances');
    const maintenanceId = `MNT-${1000 + count + 1}`;

    const newRecord = await DataEngine.create('maintenances', {
      maintenanceId,
      vehicle: vehicle._id,
      maintenanceType,
      description: description.trim(),
      serviceDate: new Date(serviceDate),
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      cost: Number(cost) || 0,
      serviceCenter: serviceCenter.trim(),
      status,
      notes
    });

    // Update vehicle status if In Progress
    if (status === 'In Progress') {
      await DataEngine.findByIdAndUpdate('vehicles', vehicleId, { status: 'Maintenance' });
    }

    // Update vehicle's service dates
    await DataEngine.findByIdAndUpdate('vehicles', vehicleId, {
      lastServiceDate: new Date(serviceDate),
      ...(nextServiceDate && { nextServiceDate: new Date(nextServiceDate) })
    });

    // Also create Expense entry
    if (cost > 0) {
      const expCount = await DataEngine.countDocuments('expenses');
      await DataEngine.create('expenses', {
        expenseId: `EXP-${1000 + expCount + 1}`,
        vehicle: vehicle._id,
        category: maintenanceType.includes('Repair') ? 'Repair' : 'Maintenance',
        amount: Number(cost),
        date: new Date(serviceDate),
        paymentMethod: 'Corporate Account',
        vendor: serviceCenter,
        description: `Maintenance: ${description}`,
        notes: `Auto-logged from maintenance #${maintenanceId}`
      });
    }

    // If manager created this work order, log operational decision
    if (req.user && req.user.role === 'fleet_manager') {
      try {
        await DataEngine.create('decisions', {
          decisionId: `DEC-${Date.now().toString().slice(-4)}`,
          title: `Maintenance Approved: ${vehicle.registrationNumber} - ${maintenanceType}`,
          category: 'maintenance',
          description: `Fleet Manager scheduled ${maintenanceType} (${description}) at ${serviceCenter}. Estimated Cost: ₹${Number(cost).toLocaleString()}`,
          relatedEntity: { entityType: 'Maintenance', entityId: newRecord._id, entityLabel: `${vehicle.registrationNumber} Service` },
          status: 'Pending Admin Review',
          priority: Number(cost) > 15000 ? 'High' : 'Medium',
          managerDecision: {
            decidedBy: req.user.name || 'Reena',
            managerRole: 'Fleet Operations Manager',
            action: 'Approved Work Order',
            amount: Number(cost) || 0,
            timestamp: new Date().toISOString(),
            notes: `Service Center: ${serviceCenter}. Target Date: ${serviceDate}`
          }
        });
      } catch (err) {
        // non-blocking
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully',
      data: newRecord
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update maintenance record
// @route PUT /api/maintenance/:id
export const updateMaintenanceRecord = async (req, res, next) => {
  try {
    const existing = await DataEngine.findById('maintenances', req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    const updated = await DataEngine.findByIdAndUpdate('maintenances', req.params.id, req.body, { new: true });

    // If marked Completed, return vehicle to Available if not on trip
    if (req.body.status === 'Completed' && existing.status !== 'Completed') {
      const vehicle = await DataEngine.findById('vehicles', existing.vehicle);
      if (vehicle && vehicle.status === 'Maintenance') {
        await DataEngine.findByIdAndUpdate('vehicles', existing.vehicle, { status: 'Available' });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Maintenance record updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete maintenance record
// @route DELETE /api/maintenance/:id
export const deleteMaintenanceRecord = async (req, res, next) => {
  try {
    await DataEngine.findByIdAndDelete('maintenances', req.params.id);
    return res.status(200).json({ success: true, message: 'Maintenance record deleted' });
  } catch (error) {
    next(error);
  }
};
