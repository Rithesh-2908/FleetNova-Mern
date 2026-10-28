import { DataEngine } from '../models/dataEngine.js';

/**
 * Resolve or synchronize a driver record corresponding to the authenticated user.
 * If the user is a registered driver but doesn't have a linked commercial driver profile yet,
 * automatically initialize one so trips, vehicles, and telematics work smoothly.
 */
export async function getDriverForUser(user) {
  if (!user) return null;
  const allDrivers = await DataEngine.find('drivers');
  
  let driver = allDrivers.find(d => 
    (d.userId && String(d.userId) === String(user._id)) ||
    (d.email && d.email.toLowerCase() === user.email.toLowerCase()) ||
    (user.email && user.email.toLowerCase() === 'driver@fleetnova.com' && d.email?.toLowerCase() === 'rajesh.kumar@fleetnova.com')
  );

  if (!driver && user.role === 'driver') {
    // Generate commercial driver profile for newly registered user
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    driver = await DataEngine.create('drivers', {
      name: user.name,
      email: user.email.toLowerCase(),
      phone: user.phone || '+91-98765-43210',
      licenseNumber: `DL-2026-${randomSuffix}`,
      licenseExpiry: new Date(Date.now() + 365 * 3 * 86400000).toISOString(),
      experienceYears: 2,
      status: 'Available',
      assignedVehicle: null,
      userId: user._id,
      notes: 'Self-registered commercial driver on FLEETNOVA.'
    });
  }

  return driver;
}

/**
 * Check if a vehicle belongs to or is assigned to the driver
 */
export function isVehicleOwnedByDriver(vehicle, driverDoc, user) {
  if (!vehicle) return false;

  const vehicleId = String(vehicle._id || vehicle.id || '');
  const driverDocId = driverDoc ? String(driverDoc._id || driverDoc.id || '') : null;
  const userId = user ? String(user._id || user.id || '') : null;
  const userEmail = user?.email?.toLowerCase();

  // Check direct owner/driver IDs
  if (vehicle.ownerId && String(vehicle.ownerId) === userId) return true;
  if (vehicle.driverId && (String(vehicle.driverId) === userId || (driverDocId && String(vehicle.driverId) === driverDocId))) return true;

  // Check assignedDriver (could be string ID or populated object)
  if (vehicle.assignedDriver) {
    if (typeof vehicle.assignedDriver === 'string') {
      if (driverDocId && vehicle.assignedDriver === driverDocId) return true;
      if (userId && vehicle.assignedDriver === userId) return true;
    } else if (typeof vehicle.assignedDriver === 'object') {
      const assignedId = String(vehicle.assignedDriver._id || vehicle.assignedDriver.id || '');
      if (driverDocId && assignedId === driverDocId) return true;
      if (userId && assignedId === userId) return true;
      if (userEmail && vehicle.assignedDriver.email?.toLowerCase() === userEmail) return true;
    }
  }

  // Check driver assignedVehicle pointer
  if (driverDoc && driverDoc.assignedVehicle) {
    const assignedVehId = typeof driverDoc.assignedVehicle === 'object'
      ? String(driverDoc.assignedVehicle._id || driverDoc.assignedVehicle.id || '')
      : String(driverDoc.assignedVehicle);
    if (assignedVehId === vehicleId) return true;
  }

  return false;
}

/**
 * Retrieve all vehicles assigned or owned by the driver
 */
export async function getDriverVehicles(user) {
  if (!user) return [];
  const driverDoc = await getDriverForUser(user);
  const allVehicles = await DataEngine.find('vehicles', {}, { populate: 'assignedDriver' });
  return allVehicles.filter(v => isVehicleOwnedByDriver(v, driverDoc, user));
}
