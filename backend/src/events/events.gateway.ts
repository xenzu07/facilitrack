import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Status } from '@prisma/client';
import { Server, Socket } from 'socket.io';

export interface StatusChangedEvent {
  reportId: string;
  jobOrderId: string | null;
  status: Status;
  message: string;
  at: string;
}

@WebSocketGateway({ cors: { origin: true } })
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private jwt: JwtService) {}

  // only clients with a valid token stay connected
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Missing token');
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token);
      await client.join(`user:${payload.sub}`);
      await client.join(`role:${payload.role}`);
    } catch {
      client.disconnect(true);
    }
  }

  // coordinators and admins see everything; others see only the users listed
  statusChanged(
    event: Omit<StatusChangedEvent, 'at'>,
    userIds: (string | null | undefined)[],
  ) {
    try {
      const rooms = new Set<string>(['role:COORDINATOR', 'role:ADMIN']);
      userIds.forEach((id) => {
        if (id) rooms.add(`user:${id}`);
      });
      const payload: StatusChangedEvent = { ...event, at: new Date().toISOString() };
      this.server.to([...rooms]).emit('report.statusChanged', payload);
    } catch (e) {
      // a failed notification must never break the saved change
      this.logger.warn(`Could not emit event: ${String(e)}`);
    }
  }
}