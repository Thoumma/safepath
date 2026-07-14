import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/services/database_service.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() {
    // Fresh in-memory DB per test.
    DatabaseService.testPathOverride = inMemoryDatabasePath;
    DatabaseService.instance.overrideDatabaseForTest(null);
  });

  test('onCreate builds the expected tables', () async {
    final db = await DatabaseService.instance.db;
    final tables = await db.query('sqlite_master',
        columns: ['name'], where: 'type = ?', whereArgs: ['table']);
    final names = tables.map((r) => r['name']).toSet();
    expect(names.containsAll({'app_user', 'known_devices', 'otp_codes'}),
        isTrue);
    await db.close();
  });

  test('app_user row round-trips', () async {
    final db = await DatabaseService.instance.db;
    await db.insert('app_user', {
      'real_hash': 'rh',
      'real_salt': 'rs',
      'fake_hash': 'fh',
      'fake_salt': 'fs',
      'created_at': 1,
    });
    final rows = await db.query('app_user');
    expect(rows.length, 1);
    expect(rows.first['real_hash'], 'rh');
    await db.close();
  });
}
