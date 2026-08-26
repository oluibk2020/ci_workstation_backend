CREATE UNIQUE INDEX "unique_active_seat_booking_date"
ON "BookingDate" ("seatId", "bookingDate")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "unique_active_beneficiary_booking_date"
ON "BookingDate" ("beneficiaryUserId", "bookingDate")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "unique_active_qr_per_user"
ON "QRCode" ("userId")
WHERE "status" = 'ACTIVE';