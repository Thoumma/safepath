import 'package:flutter_test/flutter_test.dart';
import 'package:safezone/models/pending_message.dart';
import 'package:safezone/services/chat_outbox.dart';
import 'package:safezone/services/chat_service.dart';

/// Device-free tests for how [ChatService.send] decides to queue. The transport
/// is faked through [ChatService.deliverOverride], and the outbox is held in a
/// plain list through its read/write seams, so nothing here touches the network
/// or secure storage. Full delivery (a real POST, [flushOutbox]) needs a
/// configured console and is covered on-device.
void main() {
  final chat = ChatService.instance;
  late List<PendingMessage> store;

  setUp(() {
    store = [];
    ChatOutbox.readOverride = () async => List.of(store);
    ChatOutbox.writeOverride = (q) async => store = List.of(q);
    ChatService.nowOverride = () => DateTime(2026, 1, 1, 12);
  });

  tearDown(() {
    ChatOutbox.readOverride = null;
    ChatOutbox.writeOverride = null;
    ChatService.deliverOverride = null;
    ChatService.nowOverride = null;
  });

  test('a delivered message is not queued', () async {
    ChatService.deliverOverride = (_) async => ChatSendOutcome.sent;

    final outcome = await chat.send('ສະບາຍດີ');

    expect(outcome, ChatSendOutcome.sent);
    expect(store, isEmpty);
  });

  test('a transient failure queues the message for retry', () async {
    ChatService.deliverOverride = (_) async => ChatSendOutcome.failed;

    final outcome = await chat.send('ຊ່ວຍດ້ວຍ');

    expect(outcome, ChatSendOutcome.failed);
    expect(store, hasLength(1));
    expect(store.single.body, 'ຊ່ວຍດ້ວຍ');
    expect(store.single.composedAt, DateTime(2026, 1, 1, 12));
  });

  test('a closed case is not queued — the message could never land', () async {
    ChatService.deliverOverride = (_) async => ChatSendOutcome.noOpenCase;

    final outcome = await chat.send('ຂອບໃຈ');

    expect(outcome, ChatSendOutcome.noOpenCase);
    expect(store, isEmpty);
  });

  test('blank text is never delivered or queued', () async {
    var delivered = false;
    ChatService.deliverOverride = (_) async {
      delivered = true;
      return ChatSendOutcome.sent;
    };

    final outcome = await chat.send('   ');

    expect(outcome, ChatSendOutcome.failed);
    expect(delivered, isFalse);
    expect(store, isEmpty);
  });

  test('pendingMessages surfaces the queue in order', () async {
    ChatService.deliverOverride = (_) async => ChatSendOutcome.failed;

    await chat.send('ໜຶ່ງ');
    await chat.send('ສອງ');

    final pending = await chat.pendingMessages();
    expect(pending.map((m) => m.body).toList(), ['ໜຶ່ງ', 'ສອງ']);
  });
}
