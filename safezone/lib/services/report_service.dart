import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config/console_config.dart';
import '../models/traffik_report.dart';

/// Outcome of submitting a trafficking report.
enum ReportStatus {
  /// The console accepted it; [ReportOutcome.refNo] holds the reference.
  sent,

  /// No connectivity. The report was not sent — reporting is not time-critical
  /// like SOS, so we surface it and let the user retry rather than queue it.
  offline,

  /// Reached the server but it rejected or failed the write.
  failed,

  /// App built without a console URL — nowhere to send it.
  notConfigured,
}

class ReportOutcome {
  final ReportStatus status;
  final String? refNo;
  const ReportOutcome(this.status, {this.refNo});
}

/// Sends a suspected-trafficking report to the console's public intake.
///
/// Deliberately unauthenticated (no phone token): a report must go through even
/// if the user has never set up a profile. It carries no identity of its own.
class ReportService {
  ReportService._();
  static final ReportService instance = ReportService._();

  Future<ReportOutcome> submit(TraffikReport report) async {
    if (!ConsoleConfig.isConfigured) {
      return const ReportOutcome(ReportStatus.notConfigured);
    }
    try {
      final res = await http
          .post(
            ConsoleConfig.reportEndpoint,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(report.toJson()),
          )
          .timeout(const Duration(seconds: 15));

      if (res.statusCode == 200 || res.statusCode == 201) {
        String? refNo;
        try {
          refNo = (jsonDecode(res.body) as Map<String, dynamic>)['refNo'] as String?;
        } catch (_) {
          // A 2xx with an unreadable body is still a success — just no ref.
        }
        return ReportOutcome(ReportStatus.sent, refNo: refNo);
      }
      return const ReportOutcome(ReportStatus.failed);
    } on SocketException {
      return const ReportOutcome(ReportStatus.offline);
    } on TimeoutException {
      return const ReportOutcome(ReportStatus.offline);
    } on http.ClientException {
      return const ReportOutcome(ReportStatus.offline);
    } catch (_) {
      return const ReportOutcome(ReportStatus.failed);
    }
  }

  /// Uploads one evidence photo and returns its opaque storage path, or null on
  /// any failure (no console URL, 503 photos-disabled, network error, reject).
  ///
  /// Photos are optional: the caller drops a null and still sends the report, so
  /// this never throws. [contentType] is the image MIME type (jpeg/png/webp).
  Future<String?> uploadPhoto(Uint8List bytes, String contentType) async {
    if (!ConsoleConfig.isConfigured) return null;
    try {
      final parts = contentType.split('/');
      final req = http.MultipartRequest('POST', ConsoleConfig.reportPhotoEndpoint)
        ..files.add(http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: 'evidence.${parts.length == 2 ? parts[1] : 'jpg'}',
          contentType: MediaType(
            parts.isNotEmpty ? parts[0] : 'image',
            parts.length == 2 ? parts[1] : 'jpeg',
          ),
        ));
      final streamed = await req.send().timeout(const Duration(seconds: 30));
      if (streamed.statusCode != 201) return null;
      final body = await streamed.stream.bytesToString();
      return (jsonDecode(body) as Map<String, dynamic>)['path'] as String?;
    } catch (_) {
      return null;
    }
  }
}
