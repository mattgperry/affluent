import { pipe } from '@popmotion/popcorn';
import {
  StreamFactory,
  Props,
  SubscriptionDefinition,
  Transformer,
  ForkObservable
} from 'types';
import { resolveSubscription } from './utils';
import { startStream } from './start';

/**
 * Define a stream
 *
 * @param create - The factory function called every time a new stream
 * of this type is initiated. Must returns a function to run once per frame.
 * @param defaultProps - The default props to provide to the initialised stream.
 */
export const stream = <P extends Props, V>(
  create: StreamFactory<P, V>,
  defaultProps?: P,
  fork?: ForkObservable<P, V>
) => {
  /**
   * Stream type. When called with `props`, will return `start` and `pipe` API.
   *
   * @param props - Props object for this stream type.
   */
  const definedStream = (props?: P, transformer?: Transformer) => {
    return {
      start: (subscriptionDefinition: SubscriptionDefinition<V>) => {
        let subscription = resolveSubscription(subscriptionDefinition);

        if (transformer) {
          const update = subscription.update;
          subscription.update = (v: V) => update(transformer(v));
        }

        return startStream({
          create,
          props: props || {},
          defaultProps,
          subscription,
          fork
        });
      },
      pipe: (...funcs: Transformer[]) => {
        const piped = pipe(
          ...[transformer, ...funcs].filter(Boolean)
        ) as Transformer;
        return definedStream(props, piped);
      }
    };
  };

  return definedStream;
};
