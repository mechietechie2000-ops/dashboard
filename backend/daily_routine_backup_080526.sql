PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE daily_routine (
  routine_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  task_name      TEXT NOT NULL,
  person         TEXT NOT NULL,
  frequency      TEXT NOT NULL CHECK(frequency IN ('daily','weekly')),
  day_of_week    TEXT,             -- comma list e.g. 'MON,WED,FRI', NULL for daily
  task_time      TEXT NOT NULL,    -- 'HH:MM' 24h
  mute           INTEGER DEFAULT 0,
  announce       INTEGER DEFAULT 0,
  active         INTEGER DEFAULT 1 -- soft-delete flag
);
INSERT INTO daily_routine VALUES(1,'Brush teeth','Kid1','daily',NULL,'08:00',0,0,1);
INSERT INTO daily_routine VALUES(2,'Homework','Kid1','daily',NULL,'16:00',0,0,1);
INSERT INTO daily_routine VALUES(3,'Brush teeth','Kid1','daily',NULL,'08:00',0,0,1);
INSERT INTO daily_routine VALUES(4,'Homework','Kid1','daily',NULL,'16:00',0,0,1);
INSERT INTO daily_routine VALUES(5,'Brush teeth','Kid1','daily',NULL,'08:00',0,0,1);
INSERT INTO daily_routine VALUES(6,'Homework','Kid1','daily',NULL,'16:00',0,0,1);
INSERT INTO daily_routine VALUES(7,'Daily Chants','Sandy','daily','Monday','07:00',0,0,1);
INSERT INTO daily_routine VALUES(8,'Abacus Sheet','Gaurik','daily','Monday','08:00',0,0,1);
INSERT INTO daily_routine VALUES(9,'Brush teeth','Kid1','daily',NULL,'08:00',0,0,1);
INSERT INTO daily_routine VALUES(161,'Rajat test','Rajat','daily','Monday','08:00',0,1,1);
INSERT INTO daily_routine VALUES(162,'Add extensions to vacode','Sandarbh','weekly','Friday','17:00',0,0,1);
INSERT INTO daily_routine VALUES(163,'Add extensions to vacode prettier, ES7plus react ja snippet ','Sandarbh','weekly','Friday','17:00',0,0,1);
COMMIT;
