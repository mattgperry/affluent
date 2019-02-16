import sync, { cancelSync, getFrameData, FrameData } from 'framesync';
import { StreamFactory, Props, Subscription, ActiveStream } from '../types';
import { isStream, resolveObservable, handleError } from './utils';

export const startStream = <P extends Props, V>(
  create: StreamFactory<P, V>,
  props: P,
  defaultProps: P,
  subscription: Subscription<V>
): ActiveStream => {
  let latest: V;
  let lastUpdated = 0;
  const resolvedProps: P = { ...defaultProps, ...props };
  const activeProps: { [key: string]: ActiveStream } = {};

  const toResolve = Object.keys(props).filter(key => isStream(props[key]));
  const numToResolve = toResolve.length;

  if (numToResolve) {
    for (let i = 0; i < numToResolve; i++) {
      const key = toResolve[i];
      activeProps[key] = props[key].start((v: any) => (resolvedProps[key] = v));
    }
  }

  const observable = resolveObservable(
    create({
      error: handleError,
      complete: () => stop(),
      initialProps: { ...resolvedProps }
    })
  );

  const update = (frame: FrameData) => {
    if (frame.timestamp !== lastUpdated) {
      latest = observable.update(resolvedProps, frame);
    }

    lastUpdated = frame.timestamp;
    return latest;
  };

  const updateListener = (frame: FrameData) => {
    update(frame);
    if (subscription.update) {
      subscription.update(latest);
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
      subscription.complete(latest);
    }

    if (observable.complete) {
      observable.complete();
    }
  };

  return {
    stop,
    pull: () => update(getFrameData())
  };
};
