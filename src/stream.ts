import sync, { cancelSync, getFrameData, FrameData } from 'framesync';

export type Props = {
  [key: string]: any;
};

export type GetLatest = (props: Props, frame: FrameData) => any;

export type OnUpdate = (v: any) => any;

export type Subscription = { update?: OnUpdate; complete?: OnUpdate };

export type SubscriptionDefinition = OnUpdate | Subscription;

export type Observable = {
  update?: GetLatest;
  complete?: () => void;
};

export type ObservableDefinition = Observable | GetLatest;

export type Lifecycle = {
  error: (err: Error) => void;
  complete: () => void;
  initial: Props;
};

export type StreamFactory = (lifecycle: Lifecycle) => GetLatest;

export type ActiveStream = {
  stop: () => void;
  pull: () => any;
};

const handleError = (err: Error) => {
  throw err;
};

const isStream = (v: any): v is ActiveStream => {
  return typeof v !== 'undefined' && v.hasOwnProperty('start');
};

const resolveSubscription = (
  subscription: SubscriptionDefinition
): Subscription => {
  if (typeof subscription === 'function') {
    return { update: subscription };
  } else {
    return subscription;
  }
};

const resolveObservable = (observable: ObservableDefinition): Observable => {
  if (typeof observable === 'function') {
    return { update: observable };
  } else {
    return observable;
  }
};

const startStream = (
  create: StreamFactory,
  props: Props,
  subscriptionDefinition: Subscription
): ActiveStream => {
  let latest: any;
  let lastUpdated = 0;
  const resolvedProps = { ...props };
  const activeProps: { [key: string]: ActiveStream } = {};
  const subscription = resolveSubscription(subscriptionDefinition);

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
      initial: { ...resolvedProps }
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

export const stream = (create: StreamFactory) => {
  return (props: Props = {}) => ({
    start: (subscription: Subscription) =>
      startStream(create, props, subscription)
  });
};
