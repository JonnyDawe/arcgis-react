import WebMap from '@arcgis/core/WebMap';
import React, {
  memo,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react';

import { useEventHandlers } from '../../hooks/useEventHandlers';
import { ArcViewWrapperProps, EsriView } from '../../typings/EsriTypes';
import { MountedViewsContext } from '../ArcView/MountedViewsContext';
import { MapContext } from '../ArcView/ViewContext';
import { ArcReactiveProp } from './ArcReactiveProp';
import { isEqual } from './isEqual';

export function createViewComponent<
  ViewConstructor extends EsriView,
  View extends InstanceType<ViewConstructor>
>(
  ViewConstructor: ViewConstructor
): React.FC<ArcViewWrapperProps<ViewConstructor, View>> {
  const ArcView: React.FC<ArcViewWrapperProps<ViewConstructor, View>> = ({
    children,
    onViewCreated,
    style,
    className,
    id,
    map,
    eventHandlers,
    ...mapViewProps
  }) => {
    const mapView = useMemo(
      () =>
        new ViewConstructor({
          map:
            map && 'constructed' in map && map.constructed
              ? (map as __esri.MapProperties)
              : new WebMap(map ?? { basemap: 'arcgis-dark-gray' }),
          ...(mapViewProps as
            | __esri.MapViewProperties
            | __esri.SceneViewProperties),
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const mapContainer = useRef<HTMLDivElement>(null);

    const internalId = useId();
    const mountedViewsContext = useContext(MountedViewsContext);
    const { onViewMount, onViewUnmount } = mountedViewsContext ?? {};

    useEffect(() => {
      if (!mapContainer.current) return;
      mapView.container = mapContainer.current;
      mapView.when(() => {
        onViewCreated?.(mapView as View);
      });

      onViewMount?.(mapView, id ?? internalId);

      return () => {
        // @ts-expect-error - container types are wrong
        mapView.container = undefined;
        onViewUnmount?.(id ?? internalId);
      };
    }, [mapView, onViewCreated, id, internalId, onViewMount, onViewUnmount]);

    useEventHandlers(mapView, eventHandlers);

    return (
      <MapContext.Provider value={mapView}>
        <div
          ref={mapContainer}
          id={id ?? internalId}
          style={style}
          className={className}
        >
          {mapView && children}
        </div>
        {Object.entries(mapViewProps).map(([key, value]) => {
          if (key === 'map') return null;
          return (
            <ArcReactiveProp
              key={key}
              accessor={mapView}
              property={key}
              value={value}
            />
          );
        })}
      </MapContext.Provider>
    );
  };
  return memo(ArcView, isEqual);
}
