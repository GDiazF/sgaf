import sqlite3
conn = sqlite3.connect('db.sqlite3')
res = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='core_profile'").fetchone()
if res:
    print(res[0])
else:
    print("TABLE DOES NOT EXIST IN SQLITE SCHEMA")
