import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../models/guardian.dart';
import '../theme.dart';

/// The live in-app map of everyone who trusts you.
///
/// Two kinds of track, drawn with the console's loudness rule — colour is
/// information: an open SOS case is **red** (pin + trail) because it is an
/// emergency; an opt-in journey share is the calm **primary blue**. A person
/// with both shows their case, which is the graver fact.
///
/// Pure presentation: the data is whatever [GuardianService.load] returned, so
/// the decoy guarantee holds for free — in duress mode the list is empty and
/// this widget is simply never built. Do not add a decoy branch here.
class GuardianMap extends StatefulWidget {
  final List<Guardian> guardians;

  /// Embedded (Guardian tab) maps keep a fixed height; the full-screen route
  /// passes null and fills its parent.
  final double? height;

  const GuardianMap({super.key, required this.guardians, this.height});

  @override
  State<GuardianMap> createState() => _GuardianMapState();
}

class _GuardianMapState extends State<GuardianMap> {
  final _controller = MapController();
  bool _mapReady = false;

  /// Everything that should influence the camera: pins and both trail kinds.
  List<LatLng> _allPoints() {
    final pts = <LatLng>[];
    for (final g in widget.guardians) {
      final c = g.activeCase;
      if (c != null && c.hasLocation) {
        pts.add(LatLng(c.lat!, c.lng!));
        pts.addAll(c.trail.map((p) => LatLng(p.lat, p.lng)));
      } else if (g.journey != null) {
        final j = g.journey!;
        pts.add(LatLng(j.lat, j.lng));
        pts.addAll(j.trail.map((p) => LatLng(p.lat, p.lng)));
      }
    }
    return pts;
  }

  void _fit() {
    final pts = _allPoints();
    if (pts.isEmpty || !_mapReady) return;
    if (pts.length == 1) {
      _controller.move(pts.first, 15);
      return;
    }
    _controller.fitCamera(
      CameraFit.coordinates(
        coordinates: pts,
        padding: const EdgeInsets.all(48),
        maxZoom: 16,
      ),
    );
  }

  @override
  void didUpdateWidget(covariant GuardianMap old) {
    super.didUpdateWidget(old);
    // Refit when a poll delivers fresh positions, so a moving person stays in
    // frame instead of walking off the edge of the initial camera.
    _fit();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final colors = context.colors;

    final polylines = <Polyline>[];
    final markers = <Marker>[];

    for (final g in widget.guardians) {
      final c = g.activeCase;
      if (c != null && c.hasLocation) {
        if (c.trail.length > 1) {
          polylines.add(Polyline(
            points: c.trail.map((p) => LatLng(p.lat, p.lng)).toList(),
            color: tokens.critical,
            strokeWidth: 4,
          ));
        }
        markers.add(_marker(
          point: LatLng(c.lat!, c.lng!),
          name: g.fullName,
          color: tokens.critical,
          live: c.isLiveTracking,
        ));
      } else if (g.journey != null) {
        final j = g.journey!;
        if (j.trail.length > 1) {
          polylines.add(Polyline(
            points: j.trail.map((p) => LatLng(p.lat, p.lng)).toList(),
            color: colors.primary,
            strokeWidth: 4,
          ));
        }
        markers.add(_marker(
          point: LatLng(j.lat, j.lng),
          name: g.fullName,
          color: colors.primary,
          live: j.isLive,
        ));
      }
    }

    final map = FlutterMap(
      mapController: _controller,
      options: MapOptions(
        // A harmless default (Vientiane) for the frame before the first fit —
        // never actually seen with data, and honest without any.
        initialCenter: const LatLng(17.9757, 102.6331),
        initialZoom: 6,
        interactionOptions: const InteractionOptions(
          // Rotation on a map read in a hurry only disorients.
          flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
        ),
        onMapReady: () {
          _mapReady = true;
          _fit();
        },
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          // OSM's tile usage policy requires an identifying user agent.
          userAgentPackageName: 'com.example.safezone',
        ),
        PolylineLayer(polylines: polylines),
        MarkerLayer(markers: markers),
        const SimpleAttributionWidget(
          source: Text('OpenStreetMap'),
        ),
      ],
    );

    if (widget.height == null) return map;
    return ClipRRect(
      borderRadius: SafeZoneTokens.borderRadius,
      child: SizedBox(height: widget.height, child: map),
    );
  }

  /// A named pin. The label sits above the point so a cluster of pins stays
  /// readable, and the live dot pulses meaning without words.
  Marker _marker({
    required LatLng point,
    required String name,
    required Color color,
    required bool live,
  }) {
    return Marker(
      point: point,
      width: 140,
      height: 64,
      // The *tip of the pin* must sit on the coordinate, so the visual anchor
      // is the bottom of the marker box.
      alignment: Alignment.topCenter,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (live) ...[
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
                Flexible(
                  child: Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.location_pin, color: color, size: 32),
        ],
      ),
    );
  }
}
