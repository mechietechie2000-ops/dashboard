# Here is the list of all tables in the DB 

| Syntax | Description |
| ----------- | ----------- |
| TableName | Used where? | Notes|
|------------|-------------|------|
|activity | routes/sports.js (mounted), scenes/kids/sports.js|  this is your worst column-casing offender| Used in routes but not yet actually used
|------------|-------------|------|
| appointments | this needs a big fix
|------------|-------------|------|
|reminders   | |  need to drop|
|------------|-------------|------|
| goals | 
|------------|-------------|------|


|------------|-------------|------|


|------------|-------------|------|



Cleanup tables

| ----------- | ----------- |
| TableName | Used where? |
|------------|-------------|
|family_members | routes/family.js, FKs reminders, goals, renewals, |Cleaned, dropped schem2. FKs are good ✅ 


app_state
goals
appointments
library_checkouts
bills
library_loans
calendar_events
push_subscriptions
daily_routine                  
daily_routine_log
daily_routine_temp
doctor_appointment             
events
users
renewals
uploads
routines
extracurricular_registrations
reminders
tasks_birthday 
tasks_anniversary
tasks_appointment
tasks_home_maintenance
tasks_kids
tasks_banking
tasks_investment
tasks_learning
tasks_vacation


repo is now public current branch: Add-Task-Form-Changes, you can review it. 
DB layer: yes, make it consistent, snake case. Dont worry about the data, I have currently nothing in the DB, I can drop and recreate the entire DB structure if required
and on top of it, you created duplicate tables

library_loans & library_checkouts (can be definately merged and instead of library_loans, can have generic "loans" table which can leverage home mortagage information) but on the frontend
we have have separate view (one for library and another for home which is not yet developed)
I don't like the tasks_ prefix to the table, remove from all tables 

tasks_birthday, tasks_anniversary, events - combine them to events
tasks_appointment, appointments , doctor_appointments - combine to appointments
tasks_home_maintenance - change to maintenance (can include home + others)
tasks_kids -> kids - is fine for now 
tasks_banking -> banking - fine for now
tasks_investment -> investments - fine for now
tasks_learning -> learning
tasks_vacation -> travel
extracurricular_registrations -> registrations (more generic to add more activities)
activity - not sure if it is being used 
reminders - reminder functionality is derived from other tables so this can be dropped
