/*
 * Only one ACTIVE booking may occupy a seat on a given date.
 *
 * Cancelled/completed BookingDate records do not block future bookings.
 */
CREATE UNIQUE INDEX "BookingDate_active_seat_date_key"
ON "BookingDate" ("seatId", "bookingDate")
WHERE "status" = 'ACTIVE';


/*
 * A beneficiary cannot have two ACTIVE bookings on the same date.
 *
 * Again, cancelled/completed dates do not block future bookings.
 */
CREATE UNIQUE INDEX "BookingDate_active_beneficiary_date_key"
ON "BookingDate" ("beneficiaryUserId", "bookingDate")
WHERE "status" = 'ACTIVE';