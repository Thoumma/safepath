import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// Opens and migrates the local SQLite database (`safezone.db`).
///
/// Singleton, matching the rest of the service layer (`.instance`).
class DatabaseService {
  DatabaseService._();
  static final DatabaseService instance = DatabaseService._();

  static const _dbName = 'safezone.db';
  static const _dbVersion = 1;

  /// Test hook: when set, the DB opens at this path (e.g.
  /// `inMemoryDatabasePath`) instead of the app's databases directory.
  static String? testPathOverride;

  Database? _db;

  Future<Database> get db async {
    return _db ??= await _open();
  }

  Future<Database> _open() async {
    final path = testPathOverride ?? p.join(await getDatabasesPath(), _dbName);
    return databaseFactory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: _dbVersion,
        onCreate: _onCreate,
      ),
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE app_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        real_hash TEXT NOT NULL,
        real_salt TEXT NOT NULL,
        fake_hash TEXT NOT NULL,
        fake_salt TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE known_devices (
        device_key TEXT PRIMARY KEY,
        label TEXT,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        device_key TEXT,
        expires_at INTEGER NOT NULL,
        consumed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    ''');
  }

  /// Test hook: inject (or reset with `null`) the open database.
  void overrideDatabaseForTest(Database? db) {
    _db = db;
  }
}
