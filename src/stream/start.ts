import sync, { cancelSync, getFrameData, FrameData } from 'framesync';
import {
  StreamFactory,
  Props,
  Subscription,
  ActiveStream,
  ForkObservable
} from '../types';
import { isStream } from './utils';
import { createObservable } from './observable';

export interface StreamConfig<P, V> {
  create: StreamFactory<P, V>;
  props: P;
  defaultProps: P;
  subscription: Subscription<V>;
  fork?: ForkObservable<P, V>;
}

export const startStream = <P extends Props, V>(
  config: StreamConfig<P, V>
): ActiveStream => {
  const { create, props, defaultProps, subscription, fork } = config;
  const resolvedProps: P = { ...defaultProps, ...props };
  const activeProps: { [key: string]: ActiveStream } = {};

  const toResolve = Object.keys(props).filter(key => isStream(props[key]));
  const numToResolve = toResolve.length;

  if (numToResolve) {
    for (let i = 0; i < numToResolve; i++) {
      const key = toResolve[i];
      activeProps[key] = props[key].start((v: any) => {
        resolvedProps[key] = v;
      });
    }
  }

  const observable = createObservable(
    create,
    () => stop(),
    { ...resolvedProps },
    fork
  );

  const update = (frame: FrameData) => {
    return observable.update(resolvedProps, frame) as V;
  };

  const updateListener = (frame: FrameData) => {
    if (subscription.update) {
      subscription.update(update(frame));
    }
  };

  updateListener(getFrameData());

  sync.update(updateListener, true);

  const stop = () => {
    cancelSync.update(updateListener);

    for (const key in activeProps) {
      activeProps[key].stop();
    }

    if (subscription.complete) {
      subscription.complete();
    }

    observable.complete();
  };

  return {
    stop,
    /**
     * @internal
     */
    pull: () => update(getFrameData())
  };
};
