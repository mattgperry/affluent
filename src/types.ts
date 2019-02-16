import { FrameData } from 'framesync';

export interface Props {
  [key: string]: any;
}

export type GetLatest<P, V> = (props: P, frame: FrameData) => V;

export type OnUpdate<V> = (v: V) => void;

export type Subscription<V> = { update?: OnUpdate<V>; complete?: OnUpdate<V> };

export type SubscriptionDefinition<V> = OnUpdate<V> | Subscription<V>;

export type Transformer = (v: any) => any;

export type Observable<P, V> = {
  update?: GetLatest<P, V>;
  complete?: () => void;
};

export type ObservableDefinition<P, V> = Observable<P, V> | GetLatest<P, V>;

export type Lifecycle<P> = {
  error: (err: Error) => void;
  complete: () => void;
  initialProps: P;
};

export type StreamFactory<P, V> = (lifecycle: Lifecycle<P>) => GetLatest<P, V>;

export type ActiveStream = {
  stop: () => void;
  pull: () => any;
};
