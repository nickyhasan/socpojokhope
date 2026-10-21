import datetime

# Import database connector with fallbacks
try:
    import pymysql
    pymysql.install_as_MySQLdb()
    HAS_PYMYSQL = True
except ImportError:
    HAS_PYMYSQL = False

try:
    import mysql.connector
    HAS_MYSQL_CONNECTOR = True
except ImportError:
    HAS_MYSQL_CONNECTOR = False

# XAMPP MySQL Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'soc_bimbel',
    'port': 3306
}

def get_db_connection():
    """Establishes and returns a database connection using PyMySQL or mysql.connector."""
    if HAS_PYMYSQL:
        return pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            port=DB_CONFIG['port'],
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
    elif HAS_MYSQL_CONNECTOR:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            port=DB_CONFIG['port']
        )
        try:
            conn.autocommit = True
        except Exception:
            pass
        return conn
    else:
        raise RuntimeError("No MySQL database connector module installed. Please install 'pymysql' or 'mysql-connector-python'.")

# Alias get_db to get_db_connection for Blueprint modularity
get_db = get_db_connection

def normalize_short_class_name(name):
    """
    Strips descriptive UI suffixes from class names to guarantee that only canonical
    short class codes are stored in the database ('English A'..'Math D', 'Semua').
    """
    if not name:
        return name
    name_str = str(name).strip()
    upper = name_str.upper()
    if 'ENGLISH A' in upper:
        return 'English A'
    if 'ENGLISH B' in upper:
        return 'English B'
    if 'ENGLISH C' in upper:
        return 'English C'
    if 'ENGLISH D' in upper:
        return 'English D'
    if 'MATH A' in upper:
        return 'Math A'
    if 'MATH B' in upper:
        return 'Math B'
    if 'MATH C' in upper:
        return 'Math C'
    if 'MATH D' in upper:
        return 'Math D'
    if 'SEMUA' in upper:
        return 'Semua'
    return name_str

def init_db():
    """Initializes tables and seeds default user & student accounts if missing."""
    try:
        conn = get_db_connection() 
        cursor = conn.cursor()

        # 1. Create students table (2027 Architecture)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nis VARCHAR(50) UNIQUE,
                full_name VARCHAR(100) NOT NULL,
                nickname VARCHAR(50),
                gender VARCHAR(20),
                birth_place VARCHAR(100),
                birth_date DATE,
                parents_name VARCHAR(100),
                student_phone VARCHAR(20),
                parent_phone VARCHAR(20),
                kelas_english VARCHAR(50) DEFAULT 'Belum Ditentukan',
                kelas_math VARCHAR(50) DEFAULT 'Belum Ditentukan',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Safe ALTER TABLE migrations for students table
        for col, col_def in [
            ("nis", "VARCHAR(50) UNIQUE"),
            ("nickname", "VARCHAR(50)"),
            ("gender", "VARCHAR(20)"),
            ("birth_place", "VARCHAR(100)"),
            ("birth_date", "DATE"),
            ("parents_name", "VARCHAR(100)"),
            ("student_phone", "VARCHAR(20)"),
            ("parent_phone", "VARCHAR(20)"),
            ("kelas_english", "VARCHAR(50) DEFAULT 'Belum Ditentukan'"),
            ("kelas_math", "VARCHAR(50) DEFAULT 'Belum Ditentukan'"),
            ("photo_url", "LONGTEXT"),
            ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        ]:
            try:
                cursor.execute(f"ALTER TABLE students ADD COLUMN {col} {col_def}")
            except Exception:
                pass

        # Safe ALTER TABLE to drop old 'kelas' column if it exists
        try:
            cursor.execute("ALTER TABLE students DROP COLUMN kelas")
        except Exception:
            pass

        # Safe ALTER TABLE to drop old 'current_grade' column if it exists
        try:
            cursor.execute("ALTER TABLE students DROP COLUMN current_grade")
        except Exception:
            pass

        # 2. Create users & tutors tables (2027 Architecture with VARCHAR(20) ID)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(20) PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                nickname VARCHAR(50),
                gender VARCHAR(20),
                contact VARCHAR(50),
                email VARCHAR(100),
                jurusan VARCHAR(100),
                role VARCHAR(20) NOT NULL DEFAULT 'guru',
                password VARCHAR(255) NOT NULL DEFAULT 'password123',
                username VARCHAR(50) UNIQUE,
                student_id INT DEFAULT NULL,
                photo_url LONGTEXT,
                kelas_english VARCHAR(100) DEFAULT NULL,
                kelas_math VARCHAR(100) DEFAULT NULL
            )
        """)

        # Safe ALTER TABLE to modify id column to VARCHAR(20) if it was previously INT
        try:
            cursor.execute("ALTER TABLE users MODIFY id VARCHAR(20) NOT NULL")
        except Exception:
            pass

        # Safe migrations for users table columns
        for col, col_def in [
            ("nickname", "VARCHAR(50)"),
            ("gender", "VARCHAR(20)"),
            ("contact", "VARCHAR(50)"),
            ("email", "VARCHAR(100)"),
            ("jurusan", "VARCHAR(100)"),
            ("photo_url", "LONGTEXT"),
            ("role", "VARCHAR(20) DEFAULT 'guru'"),
            ("password", "VARCHAR(255) DEFAULT 'password123'"),
            ("username", "VARCHAR(50)"),
            ("student_id", "INT DEFAULT NULL"),
            ("kelas_english", "VARCHAR(100) DEFAULT NULL"),
            ("kelas_math", "VARCHAR(100) DEFAULT NULL")
        ]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_def}")
            except Exception:
                pass

        # Safe drop of redundant columns from users table
        for drop_col in ["password_display", "teacher_code", "specialization", "kelas"]:
            try:
                cursor.execute(f"ALTER TABLE users DROP COLUMN {drop_col}")
            except Exception:
                pass

        # Create tutors table reflecting 2027 schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tutors (
                id VARCHAR(20) PRIMARY KEY,
                teacher_code VARCHAR(20),
                full_name VARCHAR(100) NOT NULL,
                nickname VARCHAR(50),
                gender VARCHAR(20),
                contact VARCHAR(50),
                email VARCHAR(100),
                jurusan VARCHAR(100),
                role VARCHAR(20) DEFAULT 'guru',
                password VARCHAR(255) DEFAULT 'password123',
                photo_url LONGTEXT
            )
        """)

        try:
            cursor.execute("ALTER TABLE tutors MODIFY id VARCHAR(20) NOT NULL")
        except Exception:
            pass

        for t_col, t_def in [
            ("teacher_code", "VARCHAR(20)"),
            ("nickname", "VARCHAR(50)"),
            ("gender", "VARCHAR(20)"),
            ("email", "VARCHAR(100)"),
            ("jurusan", "VARCHAR(100)"),
            ("role", "VARCHAR(20) DEFAULT 'guru'"),
            ("password", "VARCHAR(255) DEFAULT 'password123'"),
            ("photo_url", "LONGTEXT")
        ]:
            try:
                cursor.execute(f"ALTER TABLE tutors ADD COLUMN {t_col} {t_def}")
            except Exception:
                pass

        # Safe drop of redundant password_display from tutors table
        try:
            cursor.execute("ALTER TABLE tutors DROP COLUMN password_display")
        except Exception:
            pass

        # 3. Create attendance table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(20) NOT NULL,
                mata_pelajaran VARCHAR(50) DEFAULT 'Karakter',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_date (student_id, date)
            )
        """)
        try:
            cursor.execute("ALTER TABLE attendance ADD COLUMN mata_pelajaran VARCHAR(50) DEFAULT 'Karakter'")
        except Exception:
            pass

        # 4. Create classes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE NOT NULL,
                mata_pelajaran VARCHAR(50) NOT NULL,
                kelas VARCHAR(100) NOT NULL DEFAULT 'Semua',
                topik VARCHAR(255) DEFAULT NULL,
                materi_link TEXT DEFAULT NULL,
                start_time VARCHAR(20) DEFAULT '14:00',
                end_time VARCHAR(20) DEFAULT '15:30',
                lokasi VARCHAR(100) DEFAULT 'Kelas Pojok Hope',
                catatan TEXT DEFAULT NULL
            )
        """)
        try:
            cursor.execute("ALTER TABLE classes MODIFY kelas VARCHAR(100) NOT NULL DEFAULT 'Semua'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN topik VARCHAR(255) DEFAULT NULL")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN materi_link TEXT DEFAULT NULL")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN start_time VARCHAR(20) DEFAULT '14:00'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN end_time VARCHAR(20) DEFAULT '15:30'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN lokasi VARCHAR(100) DEFAULT 'Kelas Pojok Hope'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN catatan TEXT DEFAULT NULL")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE classes ADD COLUMN link_materi_siswa VARCHAR(500) DEFAULT NULL")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE schedules ADD COLUMN link_materi_siswa VARCHAR(500) DEFAULT NULL")
        except Exception:
            pass

        # 5. Create evaluations table
        try:
            cursor.execute("SHOW COLUMNS FROM evaluations LIKE 'bulan'")
            has_bulan = cursor.fetchone()
            if not has_bulan:
                cursor.execute("DROP TABLE IF EXISTS evaluations")
        except Exception:
            pass

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                bulan VARCHAR(20) NOT NULL,
                tahun INT NOT NULL DEFAULT 2026,
                score_empathy INT DEFAULT 0,
                score_honesty INT DEFAULT 0,
                score_responsibility INT DEFAULT 0,
                score_respect INT DEFAULT 0,
                score_fluency INT DEFAULT 0,
                score_reading INT DEFAULT 0,
                score_logic INT DEFAULT 0,
                score_arithmetic INT DEFAULT 0,
                stars INT DEFAULT 0,
                kelas_english VARCHAR(100) NULL,
                kelas_math VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_period (student_id, bulan, tahun)
            )
        """)

        # Safe migrations for evaluations table columns
        for col, col_def in [
            ("tahun", "INT NOT NULL DEFAULT 2026"),
            ("kelas_english", "VARCHAR(100) NULL"),
            ("kelas_math", "VARCHAR(100) NULL")
        ]:
            try:
                cursor.execute(f"ALTER TABLE evaluations ADD COLUMN {col} {col_def}")
            except Exception:
                pass

        # 6. Create class_assignments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS class_assignments (
                class_name VARCHAR(100) PRIMARY KEY,
                teacher_name VARCHAR(100)
            )
        """)

        # Migration Point 5 & 7: Deduplicate and normalize class_assignments to exactly 8 canonical rows
        canonical_classes = [
            ('English A', 'Miss Dela, S.Pd.'),
            ('English B', 'Miss Dela, S.Pd.'),
            ('English C', 'Miss Nisa, S.Pd.'),
            ('English D', 'Miss Nisa, S.Pd.'),
            ('Math A', 'Sir Nicky, S.Kom.'),
            ('Math B', 'Sir Nicky, S.Kom.'),
            ('Math C', 'Miss Fidya, S.Pd.'),
            ('Math D', 'Miss Fidya, S.Pd.')
        ]

        # Read existing assignments to preserve assigned teachers if any
        existing_assignments = {}
        try:
            cursor.execute("SELECT class_name, teacher_name FROM class_assignments")
            ca_rows = cursor.fetchall()
            for r in ca_rows:
                c_raw = r['class_name'] if isinstance(r, dict) else r[0]
                t_raw = r['teacher_name'] if isinstance(r, dict) else r[1]
                norm_c = normalize_short_class_name(c_raw)
                # Normalize legacy teacher names
                t_norm = t_raw or ''
                t_lower = t_norm.lower()
                if 'nicky' in t_lower:
                    t_norm = 'Sir Nicky, S.Kom.'
                elif 'dela' in t_lower or 'nadhila' in t_lower:
                    t_norm = 'Miss Dela, S.Pd.'
                elif 'nisa' in t_lower or 'anisa' in t_lower:
                    t_norm = 'Miss Nisa, S.Pd.'
                elif 'fidya' in t_lower:
                    t_norm = 'Miss Fidya, S.Pd.'
                elif 'sity' in t_lower or 'djabar' in t_lower:
                    t_norm = ''
                if norm_c and t_norm:
                    existing_assignments[norm_c] = t_norm
        except Exception:
            pass

        # Clear and repopulate class_assignments with strictly the 8 canonical rows
        cursor.execute("DELETE FROM class_assignments")
        for c_code, default_teacher in canonical_classes:
            assigned_teacher = existing_assignments.get(c_code) or default_teacher
            cursor.execute(
                "INSERT INTO class_assignments (class_name, teacher_name) VALUES (%s, %s)",
                (c_code, assigned_teacher)
            )

        # Migration Point 7: Strip descriptive UI suffixes in students, evaluations, and classes
        try:
            for c_code in ['English A', 'English B', 'English C', 'English D']:
                cursor.execute("UPDATE students SET kelas_english = %s WHERE kelas_english LIKE %s", (c_code, f"%{c_code}%"))
                cursor.execute("UPDATE evaluations SET kelas_english = %s WHERE kelas_english LIKE %s", (c_code, f"%{c_code}%"))
                cursor.execute("UPDATE classes SET kelas = %s WHERE (UPPER(mata_pelajaran) LIKE '%ENG%' OR UPPER(kelas) LIKE '%ENG%') AND kelas LIKE %s", (c_code, f"%{c_code}%"))

            for c_code in ['Math A', 'Math B', 'Math C', 'Math D']:
                cursor.execute("UPDATE students SET kelas_math = %s WHERE kelas_math LIKE %s", (c_code, f"%{c_code}%"))
                cursor.execute("UPDATE evaluations SET kelas_math = %s WHERE kelas_math LIKE %s", (c_code, f"%{c_code}%"))
                cursor.execute("UPDATE classes SET kelas = %s WHERE (UPPER(mata_pelajaran) LIKE '%MAT%' OR UPPER(kelas) LIKE '%MAT%') AND kelas LIKE %s", (c_code, f"%{c_code}%"))

            cursor.execute("UPDATE classes SET kelas = 'Semua' WHERE UPPER(kelas) LIKE '%SEMUA%'")
        except Exception as e:
            print(f"Error normalizing class names across tables: {e}")

        cursor.execute("SELECT COUNT(*) as count FROM classes")
        cres = cursor.fetchone()
        ccount = cres['count'] if isinstance(cres, dict) else cres[0]
        if ccount == 0:
            initial_schedules = [
                ('2026-09-05', 'English', 'English A (Foundation)'),
                ('2026-09-12', 'Matematika', 'Math A (Dasar Angka)'),
                ('2026-09-19', 'Karakter', 'Semua'),
                ('2026-09-26', 'Outdoor Learning', 'Semua'),
                ('2026-09-05', 'English', 'English B (Beginner)'),
                ('2026-09-12', 'Matematika', 'Math B (Operasi Hitung)'),
                ('2026-09-19', 'Karakter', 'Semua'),
                ('2026-09-26', 'Outdoor Learning', 'Semua')
            ]
            for sdate, smapels, skelas in initial_schedules:
                cursor.execute(
                    "INSERT INTO classes (date, mata_pelajaran, kelas) VALUES (%s, %s, %s)",
                    (sdate, smapels, skelas)
                )

        # 7. Create site_settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS site_settings (
                key_name VARCHAR(100) PRIMARY KEY,
                value_text TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        default_settings = [
            ('alamat_soc', 'Jln Pasar Minggu, Kec Kabila, Desa Dutohe, Gorontalo.'),
            ('jam_operasional', 'Senin - Sabtu (14:00 - 17:30 WITA)'),
            ('sponsors_json', '[{"name": "Allies Youth Development", "url": "https://alliesyouth.org/", "icon": "fas fa-hand-holding-heart"}, {"name": "Peacemakers Indonesia", "url": "https://www.instagram.com/pismovement/", "icon": "fab fa-instagram"}]'),
            ('reg_siswa_open', 'true'),
            ('reg_siswa_url', 'https://docs.google.com/forms/d/e/1FAIpQLScb42Ck9syRCpdjbPYyQdnheEpfDlES66TnP3cVtMfkzevC3g/viewform?usp=header'),
            ('reg_guru_open', 'true'),
            ('reg_guru_url', 'https://docs.google.com/forms/d/e/1FAIpQLScb42Ck9syRCpdjbPYyQdnheEpfDlES66TnP3cVtMfkzevC3g/viewform?usp=header'),
            ('reg_volunteer_open', 'true'),
            ('reg_volunteer_url', 'https://docs.google.com/forms/d/e/1FAIpQLScb42Ck9syRCpdjbPYyQdnheEpfDlES66TnP3cVtMfkzevC3g/viewform?usp=header')
        ]
        for skey, sval in default_settings:
            cursor.execute("""
                INSERT INTO site_settings (key_name, value_text)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE value_text = COALESCE(NULLIF(site_settings.value_text, ''), VALUES(value_text))
            """, (skey, sval))

        # Seed students if table is empty
        cursor.execute("SELECT COUNT(*) as count FROM students")
        res = cursor.fetchone()
        count = res['count'] if isinstance(res, dict) else res[0]

        if count == 0:
            initial_students = [
                ('1001', 'Budi Santoso', 'Budi', 'L', 'Gorontalo', '2015-05-10', 'Santoso', '08123456789', '08123456780', 'English A (Foundation)', 'Math A (Dasar Angka)'),
                ('1002', 'Aisyah Putri', 'Aisyah', 'P', 'Gorontalo', '2015-06-12', 'Putri', '08123456788', '08123456781', 'English A (Foundation)', 'Math A (Dasar Angka)'),
                ('1003', 'Rendi Pratama', 'Rendi', 'L', 'Gorontalo', '2016-01-20', 'Pratama', '08123456787', '08123456782', 'English A (Foundation)', 'Math B (Operasi Hitung)'),
                ('1004', 'Dewi Rahayu', 'Dewi', 'P', 'Gorontalo', '2016-03-15', 'Rahayu', '08123456786', '08123456783', 'English B (Beginner)', 'Math A (Dasar Angka)'),
                ('1005', 'Ahmad Hidayat', 'Ahmad', 'L', 'Gorontalo', '2015-11-05', 'Hidayat', '08123456785', '08123456784', 'English B (Beginner)', 'Math B (Operasi Hitung)'),
                ('1006', 'Fajar Ramadhan', 'Fajar', 'L', 'Gorontalo', '2014-08-17', 'Ramadhan', '08123456784', '08123456785', 'English B (Beginner)', 'Math C (Pecahan & Desimal)'),
                ('1007', 'Siti Nurhaliza', 'Siti', 'P', 'Gorontalo', '2014-09-22', 'Nurhaliza', '08123456783', '08123456786', 'English C (Intermediate)', 'Math B (Operasi Hitung)'),
                ('1008', 'Yoga Pratama', 'Yoga', 'L', 'Gorontalo', '2014-12-01', 'Pratama', '08123456782', '08123456787', 'English C (Intermediate)', 'Math C (Pecahan & Desimal)'),
                ('1009', 'Rizky Ramadhan', 'Rizky', 'L', 'Gorontalo', '2015-02-14', 'Ramadhan', '08123456781', '08123456788', 'English C (Intermediate)', 'Math D (Aljabar & Geometri)'),
                ('1010', 'Nabila Zahra', 'Nabila', 'P', 'Gorontalo', '2015-04-30', 'Zahra', '08123456780', '08123456789', 'English D (Advanced)', 'Math D (Aljabar & Geometri)')
            ]
            for nis, sname, snick, sgender, sbplace, sbdate, sportu, sphone, spphone, seng, smath in initial_students:
                cursor.execute(
                    """INSERT INTO students (nis, full_name, nickname, gender, birth_place, birth_date, parents_name, student_phone, parent_phone, kelas_english, kelas_math) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (nis, sname, snick, sgender, sbplace, sbdate, sportu, sphone, spphone, seng, smath)
                )

        # Seed users if table is empty
        cursor.execute("SELECT COUNT(*) as count FROM users")
        ures = cursor.fetchone()
        ucount = ures['count'] if isinstance(ures, dict) else ures[0]

        if ucount == 0:
            users_to_seed = [
                ('0125001', 'admin', 'password123', 'Administrator', 'admin', 'Admin', 'L', '08111111111', 'admin@soc.org', 'Semua', None),
                ('0125002', 'manager', 'password123', 'Manager Operational', 'manager', 'Manager', 'L', '08222222222', 'manager@soc.org', 'Manajemen', None),
                ('0125003', 'gurua', 'password123', 'Miss Dela, S.Pd.', 'guru', 'Dela', 'P', '081234567890', 'dela@soc.org', 'English', None),
                ('0125004', 'gurub', 'password123', 'Sir Nicky, S.Kom.', 'guru', 'Nicky', 'L', '081298765432', 'nicky@soc.org', 'Matematika', None),
                ('0125005', 'guruc', 'password123', 'Miss Fidya', 'guru', 'Fidya', 'P', '081398765432', 'fidya@soc.org', 'Matematika', None),
                ('0125006', 'gurud', 'password123', 'Miss Nisa', 'guru', 'Nisa', 'P', '081555551234', 'nisa@soc.org', 'English', None),
                ('0125007', 'user', 'password123', 'Budi Santoso', 'siswa', 'Budi', 'L', '08123456789', 'budi@soc.org', 'Siswa', 1),
                ('0125008', 'budi', 'password123', 'Budi Santoso', 'siswa', 'Budi', 'L', '08123456789', 'budi@soc.org', 'Siswa', 1),
                ('0125009', 'aisyah', 'password123', 'Aisyah Putri', 'siswa', 'Aisyah', 'P', '08123456788', 'aisyah@soc.org', 'Siswa', 2),
                ('0125010', 'rendi', 'password123', 'Rendi Pratama', 'siswa', 'Rendi', 'L', '08123456787', 'rendi@soc.org', 'Siswa', 3),
                ('0125011', 'dewi', 'password123', 'Dewi Rahayu', 'siswa', 'Dewi', 'P', '08123456786', 'dewi@soc.org', 'Siswa', 4),
                ('0125012', 'ahmad', 'password123', 'Ahmad Hidayat', 'siswa', 'Ahmad', 'L', '08123456785', 'ahmad@soc.org', 'Siswa', 5),
                ('0125013', 'fajar', 'password123', 'Fajar Ramadhan', 'siswa', 'Fajar', 'L', '08123456784', 'fajar@soc.org', 'Siswa', 6),
                ('0125014', 'siti', 'password123', 'Siti Nurhaliza', 'siswa', 'Siti', 'P', '08123456783', 'siti@soc.org', 'Siswa', 7),
                ('0125015', 'yoga', 'password123', 'Yoga Pratama', 'siswa', 'Yoga', 'L', '08123456782', 'yoga@soc.org', 'Siswa', 8),
                ('0125016', 'rizky', 'password123', 'Rizky Ramadhan', 'siswa', 'Rizky', 'L', '08123456781', 'rizky@soc.org', 'Siswa', 9),
                ('0125017', 'nabila', 'password123', 'Nabila Zahra', 'siswa', 'Nabila', 'P', '08123456780', 'nabila@soc.org', 'Siswa', 10),
            ]
            for uid, uname, upass, ufullname, urole, unick, ugender, ucontact, uemail, uspec, ustudent_id in users_to_seed:
                cursor.execute(
                    """INSERT IGNORE INTO users (id, username, password, full_name, role, nickname, gender, contact, email, jurusan, student_id) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (uid, uname, upass, ufullname, urole, unick, ugender, ucontact, uemail, uspec, ustudent_id)
                )

        # Seed tutors table if empty
        try:
            cursor.execute("SELECT COUNT(*) as count FROM tutors")
            tres = cursor.fetchone()
            tcount = tres['count'] if isinstance(tres, dict) else tres[0]
            if tcount == 0:
                tutors_to_seed = [
                    ('0325003', '0325003', 'Sir Nicky, S.Kom.', 'Nicky', 'Laki-laki', '085146268132', 'nicky@soc.org', 'S1 Teknik Informatika', 'guru', 'password123'),
                    ('0325004', '0325004', 'Miss Fidya, S.Pd.', 'Fidya', 'Perempuan', '089529435086', 'fidya@soc.org', 'S1 Pendidikan Matematika', 'guru', 'password123'),
                    ('0325005', '0325005', 'Miss Dela, S.Pd.', 'Dela', 'Perempuan', '085396278206', 'dela@soc.org', 'S1 Pendidikan Bahasa Inggris', 'guru', 'password123'),
                    ('0325006', '0325006', 'Miss Nisa, S.Pd.', 'Nisa', 'Perempuan', '082265260758', 'nisa@soc.org', 'S1 Pendidikan Bahasa Inggris', 'guru', 'password123')
                ]
                for tid, tcode, tname, tnick, tgender, tcontact, temail, tspec, trole, tpass in tutors_to_seed:
                    cursor.execute(
                        """INSERT IGNORE INTO tutors (id, teacher_code, full_name, nickname, gender, contact, email, jurusan, role, password)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (tid, tcode, tname, tnick, tgender, tcontact, temail, tspec, trole, tpass)
                    )
        except Exception:
            pass

        # Backfill and synchronize existing teachers (0325003..0325006)
        existing_teachers = [
            ('0325003', 'Sir Nicky, S.Kom.', 'Nicky', 'Laki-laki', '085146268132', 'nicky@soc.org', 'S1 Teknik Informatika', 'SoC25003'),
            ('0325004', 'Miss Fidya, S.Pd.', 'Fidya', 'Perempuan', '089529435086', 'fidya@soc.org', 'S1 Pendidikan Matematika', 'SoC25004'),
            ('0325005', 'Miss Dela, S.Pd.', 'Dela', 'Perempuan', '085396278206', 'dela@soc.org', 'S1 Pendidikan Bahasa Inggris', 'SoC25005'),
            ('0325006', 'Miss Nisa, S.Pd.', 'Nisa', 'Perempuan', '082265260758', 'nisa@soc.org', 'S1 Pendidikan Bahasa Inggris', 'SoC25006')
        ]
        for t_id, t_name, t_nick, t_gender, t_phone, t_email, t_jurusan, t_pwd in existing_teachers:
            try:
                # Update users table
                cursor.execute("""
                    UPDATE users 
                    SET full_name = %s,
                        nickname = %s,
                        gender = %s,
                        contact = %s,
                        email = %s,
                        jurusan = %s,
                        password = %s
                    WHERE id = %s OR LOWER(username) = %s
                """, (t_name, t_nick, t_gender, t_phone, t_email, t_jurusan, t_pwd, t_id, t_nick.lower()))

                # Upsert tutors table
                cursor.execute("""
                    INSERT INTO tutors (id, teacher_code, full_name, nickname, gender, contact, email, jurusan, role, password)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'guru', %s)
                    ON DUPLICATE KEY UPDATE
                        teacher_code = VALUES(teacher_code),
                        full_name = VALUES(full_name),
                        nickname = VALUES(nickname),
                        gender = VALUES(gender),
                        contact = VALUES(contact),
                        email = VALUES(email),
                        jurusan = VALUES(jurusan),
                        password = VALUES(password)
                """, (t_id, t_id, t_name, t_nick, t_gender, t_phone, t_email, t_jurusan, t_pwd))
            except Exception as e:
                print(f"Error backfilling teacher {t_id}: {e}")

        # Founder (0125001), Manager (0225001) & Administrator (1001001) accounts setup
        try:
            # Migrate legacy Admin ID 0025001 to 1001001 if exists
            try:
                cursor.execute("UPDATE users SET id = '1001001' WHERE id = '0025001'")
            except Exception as e_mig:
                print(f"Admin id migration note: {e_mig}")

            # 0. Administrator: Administrator SoC (1001001)
            cursor.execute("SELECT id, password FROM users WHERE id IN ('1001001', '0025001') OR username = 'admin'")
            admin_row = cursor.fetchone()
            if not admin_row:
                cursor.execute("""
                    INSERT INTO users (id, username, full_name, nickname, gender, contact, email, jurusan, role, password)
                    VALUES ('1001001', 'admin', 'Administrator SoC', 'Admin', 'Laki-laki', '081111111111', 'admin@soc.org', 'Sistem Administrator', 'admin', 'admin123')
                """)
            else:
                cursor.execute("UPDATE users SET id = '1001001', role = 'admin' WHERE id IN ('1001001', '0025001') OR username = 'admin'")
            
            # Ensure admin is removed from tutors table
            cursor.execute("DELETE FROM tutors WHERE id IN ('0025001', '1001001') OR teacher_code IN ('0025001', '1001001') OR LOWER(role) = 'admin'")

            # 1. Founder: Minarti Monoarfa (0125001)
            cursor.execute("""
                INSERT INTO users (id, username, full_name, nickname, gender, contact, email, jurusan, role, password)
                VALUES ('0125001', 'narti', 'Minarti Monoarfa', 'Narti', 'Perempuan', '082190029889', 'narti@soc.org', 'Founder School of Character', 'founder', 'SoC25001')
                ON DUPLICATE KEY UPDATE
                    full_name = 'Minarti Monoarfa',
                    nickname = 'Narti',
                    gender = 'Perempuan',
                    contact = '082190029889',
                    email = 'narti@soc.org',
                    jurusan = 'Founder School of Character',
                    role = 'founder',
                    password = 'SoC25001'
            """)
            cursor.execute("""
                INSERT INTO tutors (id, teacher_code, full_name, nickname, gender, contact, email, jurusan, role, password)
                VALUES ('0125001', '0125001', 'Minarti Monoarfa', 'Narti', 'Perempuan', '082190029889', 'narti@soc.org', 'Founder School of Character', 'founder', 'SoC25001')
                ON DUPLICATE KEY UPDATE
                    teacher_code = '0125001',
                    full_name = 'Minarti Monoarfa',
                    nickname = 'Narti',
                    gender = 'Perempuan',
                    contact = '082190029889',
                    email = 'narti@soc.org',
                    jurusan = 'Founder School of Character',
                    role = 'founder',
                    password = 'SoC25001'
            """)

            # 2. Manager: Sity Djabar, M.Pd. (0225001) - remove/convert old 0326007 if present
            cursor.execute("DELETE FROM users WHERE id = '0326007'")
            cursor.execute("DELETE FROM tutors WHERE id = '0326007' OR teacher_code = '0326007'")
            cursor.execute("""
                INSERT INTO users (id, username, full_name, nickname, gender, contact, email, jurusan, role, password)
                VALUES ('0225001', 'sity', 'Sity Djabar, M.Pd.', 'Sity', 'Perempuan', '085255551234', 'sity@soc.org', 'S2 Pendidikan', 'manager', 'SoC25001')
                ON DUPLICATE KEY UPDATE
                    full_name = 'Sity Djabar, M.Pd.',
                    nickname = 'Sity',
                    gender = 'Perempuan',
                    contact = '085255551234',
                    email = 'sity@soc.org',
                    jurusan = 'S2 Pendidikan',
                    role = 'manager',
                    password = 'SoC25001'
            """)
            cursor.execute("""
                INSERT INTO tutors (id, teacher_code, full_name, nickname, gender, contact, email, jurusan, role, password)
                VALUES ('0225001', '0225001', 'Sity Djabar, M.Pd.', 'Sity', 'Perempuan', '085255551234', 'sity@soc.org', 'S2 Pendidikan', 'manager', 'SoC25001')
                ON DUPLICATE KEY UPDATE
                    teacher_code = '0225001',
                    full_name = 'Sity Djabar, M.Pd.',
                    nickname = 'Sity',
                    gender = 'Perempuan',
                    contact = '085255551234',
                    email = 'sity@soc.org',
                    jurusan = 'S2 Pendidikan',
                    role = 'manager',
                    password = 'SoC25001'
            """)

            # Remove Miss Sity from class_assignments table
            cursor.execute("UPDATE class_assignments SET teacher_name = '' WHERE teacher_name LIKE %s OR teacher_name LIKE %s", ('%Sity%', '%Djabar%'))
        except Exception as e:
            print(f"Error setting up founder/manager: {e}")

        # Synchronize users & tutors tables and perform cleanup migrations
        try:
            # Sync staff/teachers from users to tutors
            cursor.execute("""
                INSERT INTO tutors (id, teacher_code, full_name, nickname, gender, contact, email, jurusan, role, password, photo_url)
                SELECT id, id, full_name, nickname, gender, contact, email, jurusan, role, password, photo_url
                FROM users
                WHERE LOWER(role) IN ('guru', 'manager', 'founder')
                ON DUPLICATE KEY UPDATE
                    teacher_code = VALUES(teacher_code),
                    full_name = VALUES(full_name),
                    nickname = VALUES(nickname),
                    gender = VALUES(gender),
                    contact = VALUES(contact),
                    email = VALUES(email),
                    jurusan = VALUES(jurusan),
                    role = VALUES(role),
                    password = VALUES(password),
                    photo_url = COALESCE(NULLIF(VALUES(photo_url), ''), tutors.photo_url)
            """)

            # Ensure users.full_name for 0325003 matches tutors.name ('Sir Nicky, S.Kom.')
            cursor.execute("UPDATE users SET full_name = 'Sir Nicky, S.Kom.' WHERE id = '0325003'")
            cursor.execute("UPDATE tutors SET full_name = 'Sir Nicky, S.Kom.' WHERE id = '0325003' OR teacher_code = '0325003'")

            # Clear kelas_english & kelas_math in users for all non-student rows
            cursor.execute("UPDATE users SET kelas_english = NULL, kelas_math = NULL WHERE LOWER(role) IN ('founder', 'manager', 'guru', 'admin')")

            # Normalize kelas_english & kelas_math in users for role = 'siswa'
            for c_code in ['English A', 'English B', 'English C', 'English D']:
                cursor.execute("UPDATE users SET kelas_english = %s WHERE role = 'siswa' AND kelas_english LIKE %s", (c_code, f"%{c_code}%"))
            for c_code in ['Math A', 'Math B', 'Math C', 'Math D']:
                cursor.execute("UPDATE users SET kelas_math = %s WHERE role = 'siswa' AND kelas_math LIKE %s", (c_code, f"%{c_code}%"))

            # Safe drop of redundant columns
            for drop_col in ["password_display", "teacher_code", "specialization", "kelas"]:
                try:
                    cursor.execute(f"ALTER TABLE users DROP COLUMN {drop_col}")
                except Exception:
                    pass
            try:
                cursor.execute("ALTER TABLE tutors DROP COLUMN password_display")
            except Exception:
                pass
        except Exception as e:
            print(f"Error synchronizing users and tutors: {e}")

        # Backfill missing NIS & Gender for legacy students
        student_backfills = [
            ('261017001', 'Laki-laki', 'Moh Raffa Algibran Ilatua', 'Raffa'),
            ('261203002', 'Laki-laki', 'Muhammad Iksan Bajuka', 'Koko'),
            ('261203003', 'Laki-laki', 'Muhammad Aksan Bajuka', 'Kiki'),
            ('260605004', 'Perempuan', 'Nur Aliya Sabrina Usman', 'Aliya'),
            ('260713005', 'Laki-laki', 'Faith Ibnu Syawal Pakaya', 'Ito'),
            ('260727006', 'Perempuan', 'Afika S. Tomolango', 'Fika'),
            ('261220007', 'Perempuan', 'Faiqoh Mutiah Hantai', 'Muthya'),
            ('260526008', 'Perempuan', 'Silva Ibrahim', 'Silva'),
            ('261121009', 'Perempuan', 'Nazwa Syafaria Bumulu', 'Nazwa'),
            ('260129010', 'Perempuan', 'Siti Zakira Zahra Hadju', 'Zakira')
        ]
        for b_nis, b_gender, b_name, b_nick in student_backfills:
            try:
                cursor.execute("""
                    UPDATE students 
                    SET nis = %s,
                        gender = %s,
                        nickname = COALESCE(NULLIF(nickname, ''), %s)
                    WHERE (nis IS NULL OR nis = '' OR nis = '-' OR gender IS NULL OR gender = '' OR gender = '-')
                      AND (LOWER(full_name) LIKE %s OR LOWER(nickname) = %s)
                """, (b_nis, b_gender, b_nick, f"%{b_name.lower()}%", b_nick.lower()))
            except Exception as e:
                print(f"Error backfilling student {b_name}: {e}")

        try:
            cursor.execute("""
                UPDATE students s
                JOIN users u ON (LOWER(TRIM(s.full_name)) = LOWER(TRIM(u.full_name)) OR LOWER(TRIM(s.nickname)) = LOWER(TRIM(u.nickname)))
                SET s.nis = COALESCE(NULLIF(s.nis, ''), u.id),
                    s.gender = COALESCE(NULLIF(s.gender, ''), u.gender)
                WHERE u.role = 'siswa'
                  AND (s.nis IS NULL OR s.nis = '' OR s.nis = '-' OR s.gender IS NULL OR s.gender = '' OR s.gender = '-')
            """)
        except Exception:
            pass

        try:
            conn.commit()
        except Exception:
            pass

        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Database initialization warning: {e}")
