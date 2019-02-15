import {
  ActiveStream,
  SubscriptionDefinition,
  Subscription,
  ObservableDefinition,
  Observable
} from '../types';

export const handleError = (err: Error) => {
  throw err;
};

export const isStream = (v: any): v is ActiveStream => {
  return typeof v !== 'undefined' && v.hasOwnProperty('start');
};

export const resolveSubscription = <V>(
  subscription: SubscriptionDefinition<V>
): Subscription<V> => {
  if (typeof subscription === 'function') {
    return { update: subscription };
  } else {
    return subscription;
  }
};

export const resolveObservable = <P, V>(
  observable: ObservableDefinition<P, V>
): Observable<P, V> => {
  if (typeof observable === 'function') {
    return { update: observable };
  } else {
    return observable;
  }
};
