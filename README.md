# <img src="https://user-images.githubusercontent.com/7850794/52860105-6d132400-3126-11e9-8aa3-69e6b1015d00.png" alt="Affluent" width="300" height="75" />

A reactive stream primitive that natively supports other streams as input.

## Say what?

This is a stream:

```javascript
spring({
  to: 100
}).start(v => v)
```

It accepts numbers and strings as props to affect the way it behaves.

An Affluent stream can also accept other streams as props:

```javascript
spring({
  to: tween({ to: 100, yoyo: Infinity })
}).start(v => v)
```

Now every prop can be a dynamic stream.

These examples don't exist yet, but when they do, they'll be built with Affluent.

## Install

```bash
npm install affluent
```

## Use

A stream can be defined with the `stream` function.

```typescript
import { stream } from 'affluent'
```

`stream` accepts two arguments: An initialisation function, and some default props.

```
stream(init, defaultProps)
```

```javascript
const frameCount = stream(() => {
  let count = 0

  return () => {
    count++
    return count
  }
})
```

It returns an `update` function. This function is resolved once for every frame the stream is active.

The `update` function also receives one argument, the stream's props.

Given this stream:

```javascript
const frameCount = stream(({ complete, initialProps }) => {
  let count = initialProps.initialCount

  return ({ increment }) => {
    count += increment
    return count
  }
}, {
  increment: 1,
  initialCount: 0 
})
```

If we now create `frameCount`:

```javascript
frameCount().start(v => v)
```

We'll get a count of `1, 2, 3...` etc, incrementing once per frame.

It's using the `increment` prop to increment by one each frame.

We can change this default using a prop:

```javascript
frameCount({ increment: 2 }).start(v => v)
// 2, 4, 6...
```

But we can also set `increment` as another stream. In the following code, `increment` will increase by `1` every frame:

```javascript
frameCount({
  increment: frameCount()
}).start(v => v)
// 1, 3, 6...
```

## API

### `stream`

`stream` defines a stream. It accepts two arguments, an initialisation function and some default props.

#### Initialisation function

This function is provided a single argument that contains three properties:

- `initialProps`: The first props provided to the stream.
- `complete`: This should be called to end the stream.
- `error`: This should be called to throw an error.

The function should return an `update` function. This function runs once per frame. It is provided the latest resolved props, and should return the latest value to emit from the stream.

```javascript
const frameCount = stream(({ complete, initialProps }) => {
  let count = initialProps.initialCount

  return ({ increment }) => {
    count += increment
    return count
  }
}, {
  increment: 1,
  initialCount: 0 
})
```

The stream returned can be turned

### Stream instance

#### `start`

Returns an active stream with a `stop` method.

#### `pipe`

### Active stream

#### `stop`
