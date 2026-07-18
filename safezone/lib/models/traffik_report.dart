/// A suspected human-trafficking report composed in the app's Report tab.
///
/// Anonymous by default — it carries no user identity. [reporterContact] is the
/// only optional identifying field, filled only if the reporter wants a
/// follow-up. Everything but [category] and [description] is optional; the point
/// is the lowest possible barrier to reporting a suspicion.
class TraffikReport {
  final String category; // one of kReportCategories' keys
  final String description;
  final String? country;
  final String? city;
  final String? locationText;
  final double? lat;
  final double? lng;
  final DateTime? observedAt;
  final String? reporterContact;

  const TraffikReport({
    required this.category,
    required this.description,
    this.country,
    this.city,
    this.locationText,
    this.lat,
    this.lng,
    this.observedAt,
    this.reporterContact,
  });

  Map<String, dynamic> toJson() => {
        'category': category,
        'description': description,
        if (country != null && country!.isNotEmpty) 'country': country,
        if (city != null && city!.isNotEmpty) 'city': city,
        if (locationText != null && locationText!.isNotEmpty)
          'locationText': locationText,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
        if (observedAt != null)
          'observedAt': observedAt!.toUtc().toIso8601String(),
        if (reporterContact != null && reporterContact!.isNotEmpty)
          'reporterContact': reporterContact,
        'source': 'MOBILE_APP',
      };
}
