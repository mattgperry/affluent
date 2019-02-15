import { pipe } from '@popmotion/popcorn';
import {
  StreamFactory,
  Props,
  SubscriptionDefinition,
  Transformer
} from 'types';
import { resolveSubscription } from './utils';
import { startStream } from './start';

export const stream = <P extends Props, V>(
  create: StreamFactory<P, V>,
  defaultProps: P
) => {
  return (props: P, transformer?: Transformer) => {
    return {
      start: (subscriptionDefinition: SubscriptionDefinition<V>) => {
        let subscription = resolveSubscription(subscriptionDefinition);

        if (transformer) {
          const update = subscription.update;
          subscription.update = (v: V) => update(transformer(v));
        }

        return startStream(create, props, defaultProps, subscription);
      },
      pipe: (...funcs: Transformer[]) => {
        const piped = pipe(
          ...[transformer, ...funcs].filter(Boolean)
        ) as Transformer;
        return stream(create, defaultProps)(props, piped);
      }
    };
  };
};
