import sys
sys.path.insert(0, 'python')
import database

conn = database.get_db()
cur = conn.cursor()

cur.execute("SELECT class_name, teacher_name FROM class_assignments")
print("class_assignments:", cur.fetchall())

cur.execute("SELECT id, full_name, kelas_english, kelas_math FROM students WHERE kelas_english LIKE '%D%' OR kelas_math LIKE '%D%'")
print("students with D:", cur.fetchall())

cur.execute("SELECT id, date, mata_pelajaran, kelas FROM classes WHERE kelas LIKE '%D%'")
print("classes with D:", cur.fetchall())

cur.execute("SELECT id, student_id, bulan, tahun, kelas_english, kelas_math FROM evaluations WHERE kelas_english LIKE '%D%' OR kelas_math LIKE '%D%'")
print("evaluations with D:", cur.fetchall())
