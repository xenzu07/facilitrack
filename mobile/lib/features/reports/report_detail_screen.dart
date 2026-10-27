import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import 'dart:async';
import '../../core/realtime.dart';

class ReportDetailScreen extends StatefulWidget {
  final String reportId;
  const ReportDetailScreen({super.key, required this.reportId});

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  Map<String, dynamic>? report;
  bool loading = true;
  String? error;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  void initState() {
    super.initState();
    load();
    _sub = Realtime.instance.events.listen((e) {
      if (mounted && e['reportId'] == widget.reportId) load(silent: true);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        loading = true;
        error = null;
      });
    }
    try {
      final res =
          await ApiClient.instance.dio.get('/reports/${widget.reportId}');
      report = Map<String, dynamic>.from(res.data);
      error = null;
    } catch (e) {
      if (!silent) error = errorMessage(e);
    }
    if (mounted) setState(() => loading = false);
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
                width: 110,
                child: Text(label, style: const TextStyle(color: Colors.grey))),
            Expanded(child: Text(value)),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report Details'), actions: [
        IconButton(icon: const Icon(Icons.refresh), onPressed: load),
      ]),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: load, child: const Text('Retry')),
                    ]),
                  ),
                )
              : _content(),
    );
  }

  Widget _content() {
    final r = report!;
    final loc = r['location'];
    final photos = r['photos'] as List;
    final logs = r['logs'] as List;
    final job = r['jobOrder'];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (photos.isNotEmpty)
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              '${AppConfig.baseUrl}${photos.first['storageUrl']}',
              height: 220,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 220,
                color: Colors.black12,
                alignment: Alignment.center,
                child: const Text('Photo could not be loaded'),
              ),
            ),
          ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(r['category']['name'],
                  style: Theme.of(context).textTheme.titleLarge),
            ),
            StatusChip(r['status']),
          ],
        ),
        const SizedBox(height: 8),
        Text(r['description']),
        const Divider(height: 32),
        _row('Location', '${loc['building']}, ${loc['floor']}, ${loc['room']}'),
        _row('Urgency', urgencyLabel(r['urgency'])),
        _row('Trade unit', r['proposedTradeUnit']['name']),
        _row('Submitted', formatDate(r['createdAt'])),
        if (job != null) ...[
          _row('Job order', job['jobOrderNo']),
          _row('Target date',
              job['targetDate'] != null ? job['targetDate'].toString().substring(0, 10) : 'Not set'),
          _row('Materials', job['materialsNote'] ?? 'Not specified'),
        ],
        const Divider(height: 32),
        Text('Status history', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...logs.map((l) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.circle, size: 14, color: statusColor(l['newStatus'])),
              title: Text(statusLabel(l['newStatus'])),
              subtitle: Text(
                  '${l['remarks'] ?? ''}\n${formatDate(l['createdAt'])}'.trim()),
              isThreeLine: l['remarks'] != null,
            )),
      ],
    );
  }
}