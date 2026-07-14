import 'package:geolocator/geolocator.dart';

class LocationResult {
  final Position? position;
  final String? error;
  LocationResult({this.position, this.error});
}

class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  Future<LocationResult> getCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationResult(error: 'GPS ປິດຢູ່ — ກະລຸນາເປີດ Location.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return LocationResult(error: 'ບໍ່ໄດ້ຮັບອະນຸຍາດໃຫ້ໃຊ້ຕຳແໜ່ງ.');
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      return LocationResult(position: pos);
    } catch (e) {
      return LocationResult(error: 'ດຶງຕຳແໜ່ງບໍ່ສຳເລັດ: $e');
    }
  }

  String mapsUrl(double lat, double lng) =>
      'https://maps.google.com/?q=$lat,$lng';
}
