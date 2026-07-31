
-- drop TABLE doctor_appointment;

CREATE TABLE doctor_appointment (
    appointment_id INTEGER PRIMARY KEY,
    patient_name STRING NOT NULL,
    doctor_name STRING NOT NULL,
    appointment_date DATE NOT NULL,
    purpose TEXT,
    amount_charged INT,
    address string,
    contact_number INT,
    doctor_special STRING,
    insurance STRING
);

insert into doctor_appointment (patient_name, doctor_name, appointment_date,purpose, doctor_special, insurance)
values ('Sandarbh', 'Shilpa Patel', '10-SEP-2023','dental root planning', 'dental','metlife');

insert into doctor_appointment (patient_name, doctor_name, appointment_date,purpose, doctor_special, insurance)
values ('Gaurik', 'Vadali Rajyalakshm', '10-SEP-2023','Yearly Checkup', 'Pediatrician ','UHC');

insert into doctor_appointment (patient_name, doctor_name, appointment_date,purpose, doctor_special, insurance)
values ('Grisha', 'Vadali Rajyalakshm', '10-SEP-2023','Yearly Checkup', 'Pediatrician ','UHC');


select * from doctor_appointment;
