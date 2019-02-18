import { stream } from '../';
import sync, { cancelSync, getFrameData } from 'framesync';
import { ForkObservable } from '../types';

describe('stream', () => {
  test('fires once a frame until stopped', async () => {
    const target = 3;
    const promise = new Promise(resolve => {
      let count = 0;
      let streamCount = 0;

      const addToCount = () => {
        count += 1;

        if (count >= target) {
          cancelSync.update(addToCount);
          stop();
          resolve(streamCount);
        }
      };

      sync.update(addToCount, true);

      const testStream = stream(() => {
        let i = 0;

        return () => {
          i++;
          return i;
        };
      }, {});

      const { stop } = testStream().start(v => {
        streamCount = v;
      });
    });

    return expect(promise).resolves.toBe(target - 1);
  });

  test('stream can stop itself', async () => {
    const promise = new Promise(async resolve => {
      const testStream = stream(({ complete }) => {
        let count = 0;
        return () => {
          count += 2;

          if (count === 4) {
            complete();
          }

          return count;
        };
      });

      let history = [];
      testStream().start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([2, 4]);
  });

  test('stream resolve static props', async () => {
    const promise = new Promise(async resolve => {
      const testStream = stream(({ complete }) => {
        let count = 0;
        return ({ increment }) => {
          count += increment;

          if (count >= 10) {
            complete();
          }

          return count;
        };
      });

      let history = [];
      testStream({ increment: 4 }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([4, 8, 12]);
  });

  test('stream resolve dynamic props', async () => {
    const promise = new Promise(async resolve => {
      const testStream = stream(({ complete }) => {
        let count = 0;
        return ({ increment }) => {
          count += increment;

          if (count >= 10) {
            complete();
          }

          return count;
        };
      });

      let history = [];
      testStream({ increment: testStream({ increment: 1 }) }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([1, 3, 6, 10]);
  });

  test('pipe', async () => {
    const promise = new Promise(async resolve => {
      const testStream = stream(({ complete }) => {
        let count = 0;
        return ({ increment }) => {
          count += increment;

          if (count >= 10) {
            complete();
          }

          return count;
        };
      });

      let history = [];
      testStream({
        increment: testStream({ increment: 1 }).pipe(v => v * 2)
      }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([2, 6, 12]);
  });

  test('pipe order', async () => {
    const promise = new Promise(async resolve => {
      const testStream = stream(({ complete }) => {
        let count = 0;
        return ({ increment }) => {
          count += increment;

          if (count >= 8) {
            complete();
          }

          return count;
        };
      });

      let history = [];
      testStream({ increment: 2 })
        .pipe(v => v * 2)
        .pipe(v => v - 1)
        .start({
          complete: () => resolve(history),
          update: v => history.push(v)
        });
    });

    return expect(promise).resolves.toEqual([3, 7, 11, 15]);
  });

  test('split streams', async () => {
    const promise = new Promise(async resolve => {
      const testStream = stream(
        ({ complete }) => {
          let count = 0;
          return ({ increment }) => {
            count += increment;

            if (count >= 5) {
              complete();
            }

            return count;
          };
        },
        {},
        ({ create, initialProps }) => {
          if (typeof initialProps.increment !== 'number') {
            const x = create({
              increment: initialProps.increment.x
            });

            const y = create({
              increment: parseFloat(initialProps.increment.y)
            });

            return ({ increment }) => {
              return {
                x: x.update({ increment: increment.x }, getFrameData()),
                y:
                  y.update(
                    { increment: parseFloat(increment.y) },
                    getFrameData()
                  ) + 'px'
              };
            };
          }

          return false;
        }
      );

      let history = [];
      testStream({ increment: { x: 1, y: '2px' }, foo: 4 }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([
      { x: 1, y: '2px' },
      { x: 2, y: '4px' },
      { x: 3, y: '6px' },
      { x: 4, y: '6px' },
      { x: 5, y: '6px' }
    ]);
  });
});
