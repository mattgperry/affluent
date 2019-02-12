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
      });

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
});
