PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE family_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name      TEXT NOT NULL,
    last_name       TEXT,
    date_of_birth   TEXT,                              -- ISO-8601: YYYY-MM-DD
    relationship    TEXT,                              -- 'self', 'spouse', 'child', etc.
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO family_members VALUES(1,'Sandarbh','Shrivastava','01/01/1990','Self','2026-08-03 22:44:13','2026-08-03 22:44:13');
INSERT INTO family_members VALUES(2,'Anupama','Shrivastava','01/01/1990','Spouse','2026-08-03 22:44:13','2026-08-03 22:44:13');
INSERT INTO family_members VALUES(3,'Gaurik','Shrivastava','01/01/1990','Child1','2026-08-03 22:44:13','2026-08-03 22:44:13');
INSERT INTO family_members VALUES(4,'Grisha','Shrivastava','01/01/1990','Child2','2026-08-03 22:44:13','2026-08-03 22:44:13');
INSERT INTO family_members VALUES(5,'Rajat','Shrivastava','01/01/1990','Nephew','2026-08-03 22:44:13','2026-08-03 22:44:13');
COMMIT;
