import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/format.dart';

class JobDetailScreen extends StatefulWidget {
  final String jobId;
  const JobDetailScreen({super.key, required this.jobId});

  @override
  State<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends State<JobDetailScreen> {
  Map<String, dynamic>? job;
  bool loading = true;
  bool updating = false;
  String? error;
  final remarksCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    remarksCtrl.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final res = await ApiClient.instance.dio.get('/job-orders/${widget.jobId}');
      job = Map<String, dynamic>.from(res.data);
    } catch (e) {
      error = errorMessage(e);
    }
    if (mounted) setState(() => loading = false);
  }

  // next allowed step: [new status, button label], or null when finished
  List<String>? get nextStep {
    switch (job?['status']) {
      case 'ASSIGNED':
        return ['IN_PROGRESS', 'Start work'];
      case 'IN_PROGRESS':
        return ['COMPLETED', 'Mark completed'];
      default:
        return null;
    }
  }

  Future<void> updateStatus(String newStatus, String label) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(label),
        content: Text(
            'Change this job to "${statusLabel(newStatus)}"? This is recorded in the status history.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirm')),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => updating = true);
    try {
      final remarks = remarksCtrl.text.trim();
      final res = await ApiClient.instance.dio.patch(
        '/job-orders/${widget.jobId}/status',
        data: {
          'status': newStatus,
          if (remarks.isNotEmpty) 'remarks': remarks,
        },
      );
      job = Map<String, dynamic>.from(res.data);
      remarksCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Status updated to ${statusLabel(newStatus)}.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(errorMessage(e))));
      }
    }
    if (mounted) setState(() => updating = false);
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
      appBar: AppBar(
        title: Text(job?['jobOrderNo'] ?? 'Job Order'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: load)],
      ),
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
    final j = job!;
    final r = j['report'];
    final loc = r['location'];
    final photos = r['photos'] as List;
    final logs = r['logs'] as List;
    final step = nextStep;
    final target = j['targetDate'] != null
        ? j['targetDate'].toString().substring(0, 10)
        : 'Not set';

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
            StatusChip(j['status']),
          ],
        ),
        const SizedBox(height: 8),
        Text(r['description']),
        const Divider(height: 32),
        _row('Location', '${loc['building']}, ${loc['floor']}, ${loc['room']}'),
        _row('Urgency', urgencyLabel(r['urgency'])),
        _row('Reported by', r['reporter']['fullName']),
        _row('Trade unit', j['tradeUnit']['name']),
        _row('Materials', j['materialsNote'] ?? 'Not specified'),
        _row('Target date', target),
        const Divider(height: 32),
        if (step != null) ...[
          Text('Update progress', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: remarksCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Remarks (optional)',
              hintText: 'What was done, or what you found on site',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: updating ? null : () => updateStatus(step[0], step[1]),
            icon: updating
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(step[0] == 'COMPLETED' ? Icons.check_circle : Icons.play_arrow),
            label: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(step[1]),
            ),
          ),
        ] else
          const Text('This job is completed. No further updates are needed.',
              style: TextStyle(color: Colors.green)),
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