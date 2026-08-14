#!/bin/sh
TABLE_NAME=$1
echo ${TABLE_NAME} 

sqlite3 ../routine.db ".dump ${TABLE_NAME}" > ${TABLE_NAME}_backup.sql

