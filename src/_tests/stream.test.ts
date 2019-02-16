import { stream } from '../';
import sync, { cancelSync } from 'framesync';

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
      const test = stream(({ complete }) => {
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
      test().start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([2, 4]);
  });

  test('stream resolve static props', async () => {
    const promise = new Promise(async resolve => {
      const test = stream(({ complete }) => {
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
      test({ increment: 4 }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([4, 8, 12]);
  });

  test('stream resolve dynamic props', async () => {
    const promise = new Promise(async resolve => {
      const test = stream(({ complete }) => {
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
      test({ increment: test({ increment: 1 }) }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([1, 3, 6, 10]);
  });

  test('pipe', async () => {
    const promise = new Promise(async resolve => {
      const test = stream(({ complete }) => {
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
      test({ increment: test({ increment: 1 }).pipe(v => v * 2) }).start({
        complete: () => resolve(history),
        update: v => history.push(v)
      });
    });

    return expect(promise).resolves.toEqual([2, 6, 12]);
  });

  test('pipe order', async () => {
    const promise = new Promise(async resolve => {
      const test = stream(({ complete }) => {
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
      test({ increment: 2 })
        .pipe(v => v * 2)
        .pipe(v => v - 1)
        .start({
          complete: () => resolve(history),
          update: v => history.push(v)
        });
    });

    return expect(promise).resolves.toEqual([3, 7, 11, 15]);
  });
});
