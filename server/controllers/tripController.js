import { DataEngine } from '../models/dataEngine.js';
import { getDriverForUser, getDriverVehicles } from '../utils/driverHelper.js';

// @desc Get all trips with filtering, search, pagination
// @route GET /api/trips
export const getTrips = async (req, res, next) => {
  try {
    const { search, status, vehicle, driver, sort = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status && status !== 'All') filter.status = status;

    let trips = await DataEngine.find('trips', filter, {
      populate: ['vehicle', 'driver']
    });

    // DRIVER ROLE ACCESS RESTRICTION:
    // Drivers only see their own assigned trips and trips for their vehicle
    if (req.user && req.user.role === 'driver') {
      const driverProfile = await getDriverForUser(req.user);
      const driverVehicles = await getDriverVehicles(req.user);
      const driverVehicleIds = driverVehicles.map(v => String(v._id || v.id));

      trips = trips.filter(t => {
        const tripDriverId = String(t.driver?._id || t.driver || '');
        const tripVehId = String(t.vehicle?._id || t.vehicle || '');
        const matchesDriver = driverProfile && (tripDriverId === String(driverProfile._id) || t.driver?.email?.toLowerCase() === req.user.email.toLowerCase());
        const matchesVehicle = driverVehicleIds.includes(tripVehId);
        return matchesDriver || matchesVehicle;
      });
    }

    if (vehicle && vehicle !== 'All') {
      trips = trips.filter(t => (t.vehicle?._id || t.vehicle) === vehicle);
    }

    if (driver && driver !== 'All') {
      trips = trips.filter(t => (t.driver?._id || t.driver) === driver);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      trips = trips.filter(t =>
        (t.tripId && t.tripId.toLowerCase().includes(q)) ||
        (t.source && t.source.toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q)) ||
        (t.vehicle?.registrationNumber && t.vehicle.registrationNumber.toLowerCase().includes(q)) ||
        (t.driver?.name && t.driver.name.toLowerCase().includes(q))
      );
    }

    const sortField = sort;
    const sortDirection = order === 'asc' ? 1 : -1;
    trips.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * sortDirection;
      if (a[sortField] > b[sortField]) return 1 * sortDirection;
      return 0;
    });

    const totalRecords = trips.length;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = trips.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      data: paginated,
      totalRecords,
      totalPages,
      currentPage: pageNum
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single trip
// @route GET /api/trips/:id
export const getTripById = async (req, res, next) => {
  try {
    const trip = await DataEngine.findById('trips', req.params.id, {
      populate: ['vehicle', 'driver']
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Driver restriction check
    if (req.user && req.user.role === 'driver') {
      const driverProfile = await getDriverForUser(req.user);
      const driverVehicles = await getDriverVehicles(req.user);
      const driverVehicleIds = driverVehicles.map(v => String(v._id || v.id));

      const tripDriverId = String(trip.driver?._id || trip.driver || '');
      const tripVehId = String(trip.vehicle?._id || trip.vehicle || '');
      const matchesDriver = driverProfile && (tripDriverId === String(driverProfile._id) || trip.driver?.email?.toLowerCase() === req.user.email.toLowerCase());
      const matchesVehicle = driverVehicleIds.includes(tripVehId);

      if (!matchesDriver && !matchesVehicle) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only permitted to view your own assigned trips.'
        });
      }
    }

    return res.status(200).json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

// @desc Create new trip with strict business validation
// @route POST /api/trips
export const createTrip = async (req, res, next) => {
  try {
    let {
      vehicleId,
      driverId,
      source,
      destination,
      startDate,
      expectedEndDate,
      distance,
      purpose = 'Cargo Delivery',
      tripExpense = 0,
      notes = ''
    } = req.body;

    // Handle driver self-scheduling
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
            message: 'You have no vehicle registered. Please register your vehicle first before scheduling a trip.'
          });
        }
      }
    }

    if (!expectedEndDate && startDate) {
      expectedEndDate = new Date(new Date(startDate).getTime() + 24 * 3600000).toISOString();
    }

    if (!vehicleId || !driverId || !source || !destination || !startDate || !expectedEndDate || distance === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, driver, source, destination, start date, expected end date and distance are required'
      });
    }

    // Verify Vehicle Business Rules
    const vehicle = await DataEngine.findById('vehicles', vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.status === 'Maintenance') {
      return res.status(400).json({
        success: false,
        message: `Vehicle ${vehicle.registrationNumber} is currently under Maintenance and cannot be assigned to a trip.`
      });
    }

    if (vehicle.status === 'Inactive') {
      return res.status(400).json({
        success: false,
        message: `Vehicle ${vehicle.registrationNumber} is inactive and cannot be scheduled.`
      });
    }

    // Verify Driver Business Rules
    const driver = await DataEngine.findById('drivers', driverId);
    if (!driver && req.user.role !== 'driver') {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const count = await DataEngine.countDocuments('trips');
    const tripId = `TRIP-${1000 + count + 1}`;

    const newTrip = await DataEngine.create('trips', {
      tripId,
      vehicle: vehicle._id,
      driver: driver ? driver._id : driverId,
      source: source.trim(),
      destination: destination.trim(),
      startDate: new Date(startDate),
      expectedEndDate: new Date(expectedEndDate),
      distance: Number(distance) || 0,
      purpose: purpose.trim(),
      fuelUsed: 0,
      tripExpense: Number(tripExpense) || 0,
      status: 'Scheduled',
      notes
    });

    // If manager created this trip, log an operational decision
    if (req.user && req.user.role === 'fleet_manager') {
      try {
        await DataEngine.create('decisions', {
          decisionId: `DEC-${Date.now().toString().slice(-4)}`,
          title: `Trip Dispatched: ${newTrip.source} ➔ ${newTrip.destination} (${newTrip.tripId})`,
          category: 'trip_dispatch',
          description: `Manager dispatched ${vehicle.registrationNumber} with driver ${driver?.name || 'Assigned Driver'} for ${purpose}.`,
          relatedEntity: { entityType: 'Trip', entityId: newTrip._id, entityLabel: newTrip.tripId },
          status: 'Manager Approved',
          priority: 'High',
          managerDecision: {
            decidedBy: req.user.name || 'Reena',
            managerRole: 'Fleet Operations Manager',
            action: 'Dispatched & Scheduled',
            amount: Number(tripExpense) || 0,
            timestamp: new Date().toISOString(),
            notes: `Distance: ${distance} km | Cargo: ${purpose}`
          }
        });
      } catch (err) {
        // non-blocking
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: newTrip
    });
  } catch (error) {
    next(error);
  }
};

// @desc Start a scheduled trip
// @route PUT /api/trips/:id/start
export const startTrip = async (req, res, next) => {
  try {
    const trip = await DataEngine.findById('trips', req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status !== 'Scheduled') {
      return res.status(400).json({
        success: false,
        message: `Only trips with 'Scheduled' status can be started. Current status: ${trip.status}`
      });
    }

    const updated = await DataEngine.findByIdAndUpdate('trips', req.params.id, {
      status: 'In Progress',
      startDate: new Date()
    }, { new: true });

    // Update vehicle & driver status
    await DataEngine.findByIdAndUpdate('vehicles', trip.vehicle, { status: 'On Trip' });
    await DataEngine.findByIdAndUpdate('drivers', trip.driver, { status: 'On Trip' });

    return res.status(200).json({
      success: true,
      message: 'Trip marked as In Progress. Vehicle and driver status updated to On Trip.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc Complete a trip
// @route PUT /api/trips/:id/complete
export const completeTrip = async (req, res, next) => {
  try {
    const { actualEndDate, fuelUsed = 0, tripExpense = 0, notes = '' } = req.body;

    const trip = await DataEngine.findById('trips', req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status !== 'In Progress') {
      return res.status(400).json({
        success: false,
        message: `Only trips currently 'In Progress' can be completed. Current status: ${trip.status}`
      });
    }

    const updated = await DataEngine.findByIdAndUpdate('trips', req.params.id, {
      status: 'Completed',
      actualEndDate: actualEndDate ? new Date(actualEndDate) : new Date(),
      fuelUsed: Number(fuelUsed) || trip.fuelUsed || 0,
      tripExpense: Number(tripExpense) || trip.tripExpense || 0,
      notes: notes ? `${trip.notes ? trip.notes + '\n' : ''}${notes}` : trip.notes
    }, { new: true });

    // Release vehicle and driver
    const vehicle = await DataEngine.findById('vehicles', trip.vehicle);
    if (vehicle) {
      const newMileage = (vehicle.currentMileage || 0) + (trip.distance || 0);
      await DataEngine.findByIdAndUpdate('vehicles', trip.vehicle, {
        status: 'Available',
        currentMileage: newMileage
      });
    }

    await DataEngine.findByIdAndUpdate('drivers', trip.driver, { status: 'Available' });

    return res.status(200).json({
      success: true,
      message: 'Trip successfully completed. Vehicle and driver set to Available.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc Cancel trip
// @route PUT /api/trips/:id/cancel
export const cancelTrip = async (req, res, next) => {
  try {
    const trip = await DataEngine.findById('trips', req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed trips cannot be cancelled.'
      });
    }

    const updated = await DataEngine.findByIdAndUpdate('trips', req.params.id, {
      status: 'Cancelled'
    }, { new: true });

    // Free vehicle and driver
    await DataEngine.findByIdAndUpdate('vehicles', trip.vehicle, { status: 'Available' });
    await DataEngine.findByIdAndUpdate('drivers', trip.driver, { status: 'Available' });

    return res.status(200).json({
      success: true,
      message: 'Trip cancelled. Vehicle and driver released.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update trip
// @route PUT /api/trips/:id
export const updateTrip = async (req, res, next) => {
  try {
    const updated = await DataEngine.findByIdAndUpdate('trips', req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc Delete trip
// @route DELETE /api/trips/:id
export const deleteTrip = async (req, res, next) => {
  try {
    await DataEngine.findByIdAndDelete('trips', req.params.id);
    return res.status(200).json({ success: true, message: 'Trip record deleted' });
  } catch (error) {
    next(error);
  }
};
