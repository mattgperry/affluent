import sync, { cancelSync, getFrameData, FrameData } from 'framesync';

export type Props = {
  [key: string]: any;
};

export type GetLatest = (props: Props, frame: FrameData) => any;

export type OnUpdate = (v: any) => any;

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

const startStream = (
  create: StreamFactory,
  props: Props,
  onUpdate: OnUpdate
): ActiveStream => {
  let latest: any;
  let lastUpdated = 0;
  const resolvedProps = { ...props };
  const activeProps: { [key: string]: ActiveStream } = {};

  const toResolve = Object.keys(props).filter(key => isStream(props[key]));
  const numToResolve = toResolve.length;

  if (numToResolve) {
    for (let i = 0; i < numToResolve; i++) {
      const key = toResolve[i];
      activeProps[key] = props[key].start((v: any) => (resolvedProps[key] = v));
    }
  }

  const getLatest = create({
    error: handleError,
    complete: () => stop,
    initial: { ...resolvedProps }
  });

  const update = (frame: FrameData) => {
    if (frame.timestamp !== lastUpdated) {
      latest = getLatest(resolvedProps, frame);
    }

    lastUpdated = frame.timestamp;
    return latest;
  };

  const updateListener = (frame: FrameData) => {
    onUpdate(update(frame));
  };

  updateListener(getFrameData());

  sync.update(updateListener, true);

  const stop = () => {
    cancelSync.update(updateListener);

    for (const key in activeProps) {
      activeProps[key].stop();
    }
  };

  return {
    stop,
    pull: () => update(getFrameData())
  };
};

export const stream = (create: StreamFactory) => {
  return (props: Props) => ({
    start: (onUpdate: OnUpdate) => startStream(create, props, onUpdate)
  });
};
