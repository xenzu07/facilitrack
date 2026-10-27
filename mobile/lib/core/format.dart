import 'package:flutter/material.dart';

String statusLabel(String s) => s
    .split('_')
    .map((w) => w[0] + w.substring(1).toLowerCase())
    .join(' ');

String urgencyLabel(String s) => s[0] + s.substring(1).toLowerCase();

Color statusColor(String s) {
  switch (s) {
    case 'SUBMITTED':
      return Colors.blueGrey;
    case 'UNDER_REVIEW':
      return Colors.orange;
    case 'ASSIGNED':
      return Colors.indigo;
    case 'IN_PROGRESS':
      return Colors.amber.shade800;
    case 'COMPLETED':
      return Colors.green;
    default:
      return Colors.grey;
  }
}

String formatDate(String iso) {
  final d = DateTime.parse(iso).toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)} ${two(d.hour)}:${two(d.minute)}';
}

class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    final color = statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(
        statusLabel(status),
        style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}