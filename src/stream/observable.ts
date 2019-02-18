import {
  StreamFactory,
  ForkObservable,
  Props,
  Observable,
  ObservableDefinition
} from '../types';
import { handleError } from './utils';
import { FrameData } from 'framesync';

const resolveObservable = <P, V>(
  definition: ObservableDefinition<P, V>
): Observable<P, V> => {
  let isComplete = false;
  let lastUpdated = 0;
  let latest: V;
  const update =
    typeof definition === 'function' ? definition : definition.update;

  return {
    update: (props: P, frame: FrameData) => {
      if (!isComplete && frame.timestamp !== lastUpdated) {
        lastUpdated = frame.timestamp;
        latest = update(props, frame);
      }

      return latest;
    },
    complete: () => {
      isComplete = true;

      if (typeof definition !== 'function' && definition.complete) {
        definition.complete();
      }
    }
  };
};

export const createObservable = <P extends Props, V>(
  create: StreamFactory<P, V>,
  complete: () => void,
  initialProps: P,
  fork?: ForkObservable<P, V>
) => {
  const unforkedObservable = () => {
    return resolveObservable(
      create({
        error: handleError,
        complete,
        initialProps
      })
    );
  };

  if (!fork) return unforkedObservable();

  let forks: Observable<P, V>[] = [];
  let numCompleted = 0;

  const forkComplete = (i: number) => () => {
    numCompleted++;
    forks[i].complete();
    if (numCompleted >= forks.length) complete();
  };

  const forkedObservable = fork({
    create: (forkInitialProps: P) => {
      const observable = resolveObservable(
        create({
          error: handleError,
          complete: forkComplete(forks.length),
          initialProps: forkInitialProps
        })
      );
      forks.push(observable);
      return observable;
    },
    initialProps
  });

  return forkedObservable
    ? {
        ...resolveObservable(forkedObservable),
        complete: () => forks.forEach(thisFork => thisFork.complete())
      }
    : unforkedObservable();
};

// const findForkStrategy = <P extends Props>(
//   { props, rules }: ForkRules,
//   initialProps: P
// ): [string[], ForkLogic | undefined] => {
//   const numProps = props.length;
//   const numRules = rules.length;
//   const propsToFork: string[] = [];

//   let forkStrategy: ForkLogic;
//   for (let propsIndex = 0; propsIndex < numProps; propsIndex++) {
//     for (let ruleIndex = 0; ruleIndex < numRules; ruleIndex++) {
//       const propKey = props[propsIndex];
//       const propToTest = initialProps[propKey];
//       const rule = rules[ruleIndex];

//       if (rule.test(propToTest)) {
//         propsToFork.push(propKey);

//         if (!forkStrategy) {
//           forkStrategy = rule;
//         } else {
//           // throw if different
//         }
//         break;
//       }
//     }
//   }

//   return [propsToFork, forkStrategy];
// };

//

// const [propsToFork, forkStrategy] = findForkStrategy(forkRules, initialProps);
// const numPropsToFork = propsToFork.length;
// const templateProp = initialProps[propsToFork[0]]

// let numResolved = 0

// const numPropsToFork = propsToFork.length;
// if (!numPropsToFork) return unforkedObservable();

// const templatePropKey = propsToFork[0];
// const templateProp = initialProps[templatePropKey];
// //const [fork, combine] = forkLogic.parse(templateProp);
// let numResolved = 0;
// let numForks = 0;

// const forked = {};

// const forkedProps = {};

// const forkComplete = () => {
//   numResolved++;
//   if (numResolved >= numForks) {
//     complete();
//   }
// };

// for (const key in templateProp) {
//   forkedProps[key] = { ...initialProps };
//   for (let i = 0; i < numPropsToFork; i++) {
//     forkedProps[key][propsToFork[i]] = templateProp[key];
//   }

//   forked[key] = resolveObservable(
//     create({
//       error: handleError,
//       complete: forkComplete,
//       initialProps: forkedProps[key]
//     })
//   );
// }

// let latest = {};

// const updateAll = (latestProps: P, frame: FrameData) => {
//   for (const key in templateProp) {
//     for (let i = 0; i < numPropsToFork; i++) {
//       forkedProps[key][propsToFork[i]] = templateProp[key];
//     }
//     latest[key] = forked[key].update(forkedProps[key], frame);
//   }

//   return latest;
// };

// const completeAll = () => {
//   for (const key in forked) {
//     forked[key].complete();
//   }
// };

// return {
//   update: updateAll,
//   complete: completeAll
// };
