import { supabase } from './supabase';

export type NetEvents = {
  onKnock: (fromId: string) => void;
  onKnockAccepted: (hostId: string) => void;
  onKnockRejected: () => void;
  onPeerMove: (x: number, y: number, z: number) => void;
  onPeerLeave: () => void;
  onKicked: () => void; // <--- Added this
};

export class DuoNetwork {
  private channel: any;
  private myId: string;
  private partnerId: string;
  private events: NetEvents;

  constructor(myId: string, partnerId: string, events: NetEvents) {
    this.myId = myId;
    this.partnerId = partnerId;
    this.events = events;

    const roomId = [myId, partnerId].sort().join('-');
    this.channel = supabase.channel(`duo_room_${roomId}`, { config: { presence: { key: myId } } });

    this.setupListeners();
  }

  private setupListeners() {
    this.channel
      .on('broadcast', { event: 'knock' }, (payload: any) => this.events.onKnock(payload.payload.fromId))
      .on('broadcast', { event: 'accept' }, (payload: any) => this.events.onKnockAccepted(payload.payload.hostId))
      .on('broadcast', { event: 'reject' }, () => this.events.onKnockRejected())
      .on('broadcast', { event: 'move' }, (payload: any) => this.events.onPeerMove(payload.payload.x, payload.payload.y, payload.payload.z))
      .on('broadcast', { event: 'leave' }, () => this.events.onPeerLeave())
      .on('broadcast', { event: 'kick' }, () => this.events.onKicked()) // <--- Added listener
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Connected to Duo Network');
        }
      });
  }

  public sendMove(x: number, y: number, z: number) {
    this.channel.send({
      type: 'broadcast',
      event: 'move',
      payload: { x, y, z }
    });
  }

  public sendKnock() {
    this.channel.send({ type: 'broadcast', event: 'knock', payload: { fromId: this.myId } });
  }

  public acceptKnock() {
    this.channel.send({ type: 'broadcast', event: 'accept', payload: { hostId: this.myId } });
  }

  public rejectKnock() {
    this.channel.send({ type: 'broadcast', event: 'reject', payload: {} });
  }

  public leave() {
    this.channel.send({ type: 'broadcast', event: 'leave', payload: {} });
  }

  public kick() { // <--- Added method
    this.channel.send({ type: 'broadcast', event: 'kick', payload: {} });
  }

  public disconnect() {
    supabase.removeChannel(this.channel);
  }
}
