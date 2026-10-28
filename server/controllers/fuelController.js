import { DataEngine } from '../models/dataEngine.js';
import { getDriverForUser, getDriverVehicles } from '../utils/driverHelper.js';

// @desc Get all fuel records with filter & pagination
// @route GET /api/fuel
export const getFuelRecords = async (req, res, next) => {
  try {
    const { vehicle, fuelType, search, page = 1, limit = 10 } = req.query;

    let records = await DataEngine.find('fuels', {}, {
      populate: ['vehicle', 'driver']
    });

    // DRIVER ROLE ACCESS RESTRICTION:
    // Drivers only see fuel records for their own vehicle
    if (req.user && req.user.role === 'driver') {
      const driverVehicles = await getDriverVehicles(req.user);
      const driverVehicleIds = driverVehicles.map(v => String(v._id || v.id));
      records = records.filter(r => {
        const vehId = String(r.vehicle?._id || r.vehicle || '');
        return driverVehicleIds.includes(vehId);
      });
    }

    if (vehicle && vehicle !== 'All') {
      records = records.filter(r => (r.vehicle?._id || r.vehicle) === vehicle);
    }

    if (fuelType && fuelType !== 'All') {
      records = records.filter(r => r.fuelType === fuelType);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      records = records.filter(r =>
        (r.fuelRecordId && r.fuelRecordId.toLowerCase().includes(q)) ||
        (r.vehicle?.registrationNumber && r.vehicle.registrationNumber.toLowerCase().includes(q)) ||
        (r.fuelStation && r.fuelStation.toLowerCase().includes(q)) ||
        (r.driver?.name && r.driver.name.toLowerCase().includes(q))
      );
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary calculations
    const totalConsumed = records.reduce((acc, r) => acc + (r.quantity || 0), 0);
    const totalCost = records.reduce((acc, r) => acc + (r.totalCost || 0), 0);
    const avgPricePerLiter = records.length > 0 ? (totalCost / (totalConsumed || 1)) : 0;

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
        totalConsumed: Math.round(totalConsumed * 10) / 10,
        totalCost: Math.round(totalCost),
        avgPricePerLiter: Math.round(avgPricePerLiter * 100) / 100,
        recordCount: totalRecords
      },
      totalRecords,
      totalPages,
      currentPage: pageNum
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create fuel entry
// @route POST /api/fuel
export const createFuelRecord = async (req, res, next) => {
  try {
    let {
      vehicleId,
      driverId,
      fuelType,
      quantity,
      pricePerLiter,
      odometerReading,
      fuelStation,
      date,
      notes = ''
    } = req.body;

    // Handle driver self-fuel logging
    if (req.user && req.user.role === 'driver') {
      const driverProfile = await getDriverForUser(req.user);
      driverId = driverProfile ? driverProfile._id : req.user._id;

      if (!vehicleId) {
        const myVehicles = await getDriverVehicles(req.user);
        if (myVehicles.length > 0) {
          vehicleId = myVehicles[0]._id;
        } else {
          return res.status(400).json({
            success: false,
            message: 'You have no vehicle registered. Please register your vehicle first before logging fuel.'
          });
        }
      }
    }

    if (!date) {
      date = new Date().toISOString();
    }

    if (!vehicleId || !quantity || !pricePerLiter || !odometerReading || !fuelStation) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, quantity, price per liter, odometer reading, and station are required'
      });
    }

    const vehicle = await DataEngine.findById('vehicles', vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const totalCost = Number(quantity) * Number(pricePerLiter);
    const count = await DataEngine.countDocuments('fuels');
    const fuelRecordId = `FUEL-${1000 + count + 1}`;

    const newRecord = await DataEngine.create('fuels', {
      fuelRecordId,
      vehicle: vehicle._id,
      driver: driverId || vehicle.assignedDriver,
      fuelType: fuelType || vehicle.fuelType || 'Diesel',
      quantity: Number(quantity),
      pricePerLiter: Number(pricePerLiter),
      totalCost: Math.round(totalCost),
      odometerReading: Number(odometerReading),
      fuelStation: fuelStation.trim(),
      date: new Date(date),
      notes
    });

    // Update vehicle odometer if reading is higher
    if (Number(odometerReading) > (vehicle.currentMileage || 0)) {
      await DataEngine.findByIdAndUpdate('vehicles', vehicleId, {
        currentMileage: Number(odometerReading)
      });
    }

    // Auto log expense
    const expCount = await DataEngine.countDocuments('expenses');
    await DataEngine.create('expenses', {
      expenseId: `EXP-${1000 + expCount + 1}`,
      vehicle: vehicle._id,
      driver: driverId || vehicle.assignedDriver,
      category: 'Fuel',
      amount: Math.round(totalCost),
      date: new Date(date),
      paymentMethod: 'Fleet Fuel Card',
      vendor: fuelStation,
      description: `Fuel Refill: ${quantity}L @ ₹${pricePerLiter}/L`,
      notes: `Auto-logged from Fuel #${fuelRecordId}`
    });

    return res.status(201).json({
      success: true,
      message: 'Fuel record saved successfully',
      data: newRecord
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update fuel record
// @route PUT /api/fuel/:id
export const updateFuelRecord = async (req, res, next) => {
  try {
    const updated = await DataEngine.findByIdAndUpdate('fuels', req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Fuel record not found' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc Delete fuel record
// @route DELETE /api/fuel/:id
export const deleteFuelRecord = async (req, res, next) => {
  try {
    await DataEngine.findByIdAndDelete('fuels', req.params.id);
    return res.status(200).json({ success: true, message: 'Fuel record deleted' });
  } catch (error) {
    next(error);
  }
};
