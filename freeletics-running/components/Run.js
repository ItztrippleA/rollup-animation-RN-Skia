// @flow
import * as React from 'react';
import {
  StyleSheet, View,
} from 'react-native';
import { MapView, Location } from 'expo';
import * as turf from '@turf/turf';

import Monitor from './Monitor';
import Pin from './Pin';

const { Marker, Polyline } = MapView;

type Position = {
  coords: {
    accuracy: number,
    altitude: number,
      altitudeAccuracy: number,
      heading: number,
      latitude: number,
      longitude: number,
      speed: number,
    },
    timestamp: number,
};

type RunProps = {
  distance: number,
  latitude: number,
  longitude: number,
};

type RunState = {
  positions: Position[],
  duration: number,
  distance: number,
};

const distanceBetween = (from: Position, to: Position) => {
  const options = { units: 'meters' };
  const origin = turf.point([from.coords.longitude, from.coords.latitude]);
  const destination = turf.point([to.coords.longitude, to.coords.latitude]);
  return turf.distance(origin, destination, options);
};

const paceBetween = (distance: number, from: Position, to: Position) => {
  const time = (to.timestamp - from.timestamp) / 1000;
  const pace = distance / 1000 / time;
  console.log({ time, distance, pace });
  return pace;
};

export default class Run extends React.PureComponent<RunProps, RunState> {
  map = React.createRef();

  state = {
    positions: [],
    duration: 0,
    distance: 0,
  };

  interval;

  watcher: { remove: () => void };

  async componentDidMount() {
    const options = { enableHighAccuracy: true, timeInterval: 1000, distanceInterval: 1 };
    this.watcher = await Location.watchPositionAsync(options, this.onNewPosition);
  }

  componentWillUnmount() {
    this.watcher.remove();
  }

  onNewPosition = (position: Position) => {
    this.map.current.animateToCoordinate(position.coords, 1000);
    const { positions } = this.state;
    const duration = positions[0] ? position.timestamp - positions[0].timestamp : 0;
    const distance = positions[0] ? distanceBetween(positions[positions.length - 1], position) : 0;
    const pace = positions[0] ? paceBetween(distance, positions[positions.length - 1], position) : 0;
    this.setState({
      positions: [...positions, position], duration, distance: this.state.distance + distance, pace,
    });
  }

  render(): React.Node {
    const {
      latitude, longitude, distance: totalDistance,
    } = this.props;
    const {
      positions, distance, pace,
    } = this.state;
    const currentPosition = positions[positions.length - 1];
    return (
      <View style={styles.container}>
        <Monitor {...{
          distance, totalDistance, pace,
        }}
        />
        <MapView
          ref={this.map}
          style={styles.map}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.001,
            longitudeDelta: 0.01,
          }}
          provider="google"
        >
          <Marker coordinate={currentPosition ? currentPosition.coords : { latitude, longitude }}>
            <Pin />
          </Marker>
          <Polyline
            strokeColor="#e9ac47"
            strokeWidth={4}
            coordinates={positions.map(position => position.coords)}
          />
        </MapView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
