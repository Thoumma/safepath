import 'dart:async';

import 'package:flutter/material.dart';

import '../models/chat_message.dart';
import '../models/pending_message.dart';
import '../services/chat_service.dart';
import '../theme.dart';

/// The user's view of their thread with the embassy duty officer.
///
/// Reached from the open-case banner on Home — it only exists while a case is
/// open, and the banner is hidden in decoy mode, so this screen is never a way
/// into the real case from a coerced phone.
///
/// There are no push notifications, so this polls on the same 15s cadence the
/// Guardian map uses: a staff reply appears within a few seconds of it being
/// sent, as long as the user is looking. Anything typed with no signal is shown
/// immediately as "sending" and delivered by [ChatService.flushOutbox] when the
/// network returns.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<ChatMessage> _delivered = const [];
  List<PendingMessage> _pending = const [];
  bool _loading = true;
  bool _offline = false;
  bool _hasOpenCase = true;
  bool _sending = false;

  final _input = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load(initial: true);
    _poll = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool initial = false}) async {
    // Deliver anything queued before reading, so a message that just landed
    // moves out of "sending" and into the thread in the same refresh.
    await ChatService.instance.flushOutbox();

    final thread = await ChatService.instance.loadThread();
    final pending = await ChatService.instance.pendingMessages();
    if (!mounted) return;

    setState(() {
      _loading = false;
      _pending = pending;
      if (thread == null) {
        // Couldn't reach the console. Keep whatever we last showed rather than
        // blanking the conversation; just mark the state so the UI can say so.
        _offline = true;
      } else {
        _offline = false;
        _delivered = thread.messages;
        _hasOpenCase = thread.hasOpenCase;
      }
    });

    // Keep the newest message in view. A thread that opens scrolled to the top
    // makes the user hunt for what just arrived.
    _scrollToBottom(animate: !initial);
  }

  void _scrollToBottom({bool animate = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      final target = _scroll.position.maxScrollExtent;
      if (animate) {
        _scroll.animateTo(
          target,
          duration: SafeZoneTokens.durationFast,
          curve: SafeZoneTokens.easing,
        );
      } else {
        _scroll.jumpTo(target);
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    _input.clear();

    final outcome = await ChatService.instance.send(text);
    if (!mounted) return;
    setState(() => _sending = false);

    if (outcome == ChatSendOutcome.noOpenCase) {
      // Put the text back so nothing is lost, and tell them why it didn't go.
      _input.text = text;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ເລື່ອງນີ້ຖືກປິດແລ້ວ — ສົ່ງຂໍ້ຄວາມບໍ່ໄດ້')),
      );
    }
    // Reload reconciles: a delivered message joins the thread, a queued one
    // shows as "sending".
    await _load();
  }

  /// The delivered thread followed by anything still queued, rendered as one
  /// list. Pending messages are always the user's own and always newest, so
  /// they sit at the end.
  List<ChatMessage> get _timeline => [
        ..._delivered,
        for (final p in _pending)
          ChatMessage(
            id: p.clientId,
            fromStaff: false,
            body: p.body,
            createdAt: p.composedAt,
            pending: true,
          ),
      ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ຂໍ້ຄວາມ ຈາກ ສະຖານທູດ')),
      body: Column(
        children: [
          if (_offline) _offlineBar(),
          Expanded(child: _list()),
          _composer(),
        ],
      ),
    );
  }

  Widget _offlineBar() {
    final tokens = context.tokens;
    final text = context.text;
    return Container(
      width: double.infinity,
      color: tokens.high.withAlpha(30),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(Icons.cloud_off_outlined, size: 16, color: tokens.highInk),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'ຕໍ່ອິນເຕີເນັດບໍ່ໄດ້ — ກຳລັງສະແດງຂໍ້ຄວາມຄັ້ງລ່າສຸດ',
              style: text.bodySmall!.copyWith(color: tokens.highInk),
            ),
          ),
        ],
      ),
    );
  }

  Widget _list() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final timeline = _timeline;
    if (timeline.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            _hasOpenCase
                ? 'ຍັງບໍ່ມີຂໍ້ຄວາມ — ຂຽນຫາສະຖານທູດໄດ້ຂ້າງລຸ່ມ'
                : 'ບໍ່ມີເລື່ອງທີ່ເປີດຢູ່',
            textAlign: TextAlign.center,
            style: context.text.bodyMedium,
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: timeline.length,
      itemBuilder: (context, i) => _bubble(timeline[i]),
    );
  }

  Widget _bubble(ChatMessage m) {
    final colors = context.colors;
    final tokens = context.tokens;
    final text = context.text;
    final mine = !m.fromStaff;

    final footer = mine
        ? (m.pending ? 'ກຳລັງສົ່ງ...' : 'ທ່ານ · ${_formatTime(m.createdAt)}')
        : '${m.authorName ?? 'ສະຖານທູດ'} · ${_formatTime(m.createdAt)}';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment:
            mine ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.78,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: mine ? colors.primary : colors.surfaceContainer,
                borderRadius: SafeZoneTokens.borderRadius,
                border: mine
                    ? null
                    : Border.all(
                        color: colors.outlineVariant,
                        width: SafeZoneTokens.ruleHair,
                      ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    m.body,
                    style: text.bodyLarge!.copyWith(
                      color: mine ? colors.onPrimary : colors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (mine && m.pending) ...[
                        Icon(
                          Icons.schedule,
                          size: 11,
                          color: colors.onPrimary.withAlpha(180),
                        ),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        footer,
                        style: text.labelSmall!.copyWith(
                          color: mine
                              ? colors.onPrimary.withAlpha(180)
                              : tokens.muted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _composer() {
    final colors = context.colors;
    final closed = !_hasOpenCase;

    return SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: colors.surface,
          border: Border(
            top: BorderSide(
              color: colors.outlineVariant,
              width: SafeZoneTokens.ruleHair,
            ),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        child: closed
            ? Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'ເລື່ອງນີ້ຖືກປິດແລ້ວ — ບໍ່ສາມາດສົ່ງຂໍ້ຄວາມໄດ້',
                  textAlign: TextAlign.center,
                  style: context.text.bodySmall,
                ),
              )
            : Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 2000,
                      textInputAction: TextInputAction.newline,
                      decoration: const InputDecoration(
                        hintText: 'ຂຽນຂໍ້ຄວາມຫາສະຖານທູດ...',
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _SendButton(sending: _sending, onPressed: _send),
                ],
              ),
      ),
    );
  }

  String _formatTime(DateTime t) {
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'ຫາກໍ່ດຽວນີ້';
    if (d.inMinutes < 60) return '${d.inMinutes} ນາທີກ່ອນ';
    if (d.inHours < 24) return '${d.inHours} ຊົ່ວໂມງກ່ອນ';
    return '${d.inDays} ມື້ກ່ອນ';
  }
}

class _SendButton extends StatelessWidget {
  const _SendButton({required this.sending, required this.onPressed});

  final bool sending;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return SizedBox(
      height: 48,
      width: 48,
      child: FilledButton(
        onPressed: sending ? null : onPressed,
        style: FilledButton.styleFrom(
          padding: EdgeInsets.zero,
          shape: const RoundedRectangleBorder(
            borderRadius: SafeZoneTokens.borderRadius,
          ),
        ),
        child: sending
            ? SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colors.onPrimary,
                ),
              )
            : const Icon(Icons.send, size: 20),
      ),
    );
  }
}
