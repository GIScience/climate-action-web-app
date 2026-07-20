import { TestBed } from '@angular/core/testing'
import { DrawInput } from '@app/dashboard/plugin/plugin.interface'
import { TranslocoService } from '@jsverse/transloco'
import type { Map as MaplibreMap } from 'maplibre-gl'
import { ToastrService } from 'ngx-toastr'
import { MapDrawingService } from './map-drawing.service'

type MockTerraDrawEvent = 'change' | 'finish' | 'ready'

let mockStartFailures = 0
const mockTerraDrawInstances: MockTerraDrawInstance[] = []

class MockTerraDrawInstance {
    enabled = false
    mode = 'static'
    listeners = new Map<MockTerraDrawEvent, Array<(...args: unknown[]) => void>>()

    start = jest.fn(() => {
        if (mockStartFailures > 0) {
            mockStartFailures--
            this.enabled = true
            throw new Error('Map style is not ready')
        }
        this.enabled = true
    })
    stop = jest.fn(() => {
        this.enabled = false
    })
    getMode = jest.fn(() => this.mode)
    setMode = jest.fn((mode: string) => {
        this.mode = mode
    })
    getSnapshot = jest.fn(() => [])
    removeFeatures = jest.fn()
    on = jest.fn((event: MockTerraDrawEvent, listener: (...args: unknown[]) => void) => {
        const listeners = this.listeners.get(event) ?? []
        listeners.push(listener)
        this.listeners.set(event, listeners)
    })
}

jest.mock('@watergis/maplibre-gl-terradraw', () => ({
    MaplibreTerradrawControl: jest.fn().mockImplementation(() => {
        const terraDraw = new MockTerraDrawInstance()
        mockTerraDrawInstances.push(terraDraw)
        return {
            getTerraDrawInstance: () => terraDraw
        }
    })
}))

describe('MapDrawingService', () => {
    type MapEvent = 'load' | 'style.load' | 'idle'
    type MockMap = {
        map: MaplibreMap
        cursor: CSSStyleDeclaration
        isStyleLoaded: jest.Mock<boolean, []>
        emit: (event: MapEvent) => void
        listenersFor: (event: MapEvent) => Array<() => void>
    }

    let service: MapDrawingService
    let mockToastr: { error: jest.Mock }

    const createMockMap = (styleLoaded: boolean): MockMap => {
        const listeners = new Map<MapEvent, Set<() => void>>()
        const cursor = {} as CSSStyleDeclaration
        const isStyleLoaded = jest.fn(() => styleLoaded)

        const map = {
            addControl: jest.fn(),
            removeControl: jest.fn(),
            getCanvas: jest.fn(() => ({ style: cursor })),
            isStyleLoaded,
            on: jest.fn((event: MapEvent, listener: () => void) => {
                const eventListeners = listeners.get(event) ?? new Set()
                eventListeners.add(listener)
                listeners.set(event, eventListeners)
            }),
            off: jest.fn((event: MapEvent, listener: () => void) => {
                listeners.get(event)?.delete(listener)
            })
        } as unknown as MaplibreMap

        return {
            map,
            cursor,
            isStyleLoaded,
            emit: event => [...(listeners.get(event) ?? [])].forEach(listener => listener()),
            listenersFor: event => [...(listeners.get(event) ?? [])]
        }
    }

    beforeEach(() => {
        jest.useFakeTimers()
        mockTerraDrawInstances.length = 0
        mockStartFailures = 0
        mockToastr = { error: jest.fn() }

        TestBed.configureTestingModule({
            providers: [
                MapDrawingService,
                { provide: TranslocoService, useValue: { translate: (key: string) => key } },
                { provide: ToastrService, useValue: mockToastr }
            ]
        })

        service = TestBed.inject(MapDrawingService)
    })

    afterEach(() => {
        jest.restoreAllMocks()
        jest.useRealTimers()
    })

    describe('startDrawing', () => {
        it('should keep the requested mode pending until a slow map style becomes ready', () => {
            let styleLoaded = false
            const mockMap = createMockMap(styleLoaded)
            mockMap.isStyleLoaded.mockImplementation(() => styleLoaded)

            service.startDrawing(DrawInput.Polygon, mockMap.map)

            const terraDraw = mockTerraDrawInstances[0]
            expect(terraDraw.start).not.toHaveBeenCalled()
            expect(service.currentDrawModeValue).toBeNull()
            expect(mockMap.listenersFor('style.load')).toHaveLength(1)

            styleLoaded = true
            mockMap.emit('style.load')

            expect(terraDraw.start).toHaveBeenCalledTimes(1)
            expect(terraDraw.setMode).toHaveBeenCalledWith(DrawInput.Polygon)
            expect(service.currentDrawModeValue).toBe(DrawInput.Polygon)
            expect(mockMap.cursor.cursor).toBe('crosshair')
            expect(mockMap.listenersFor('load')).toHaveLength(0)
            expect(mockMap.listenersFor('style.load')).toHaveLength(0)
            expect(mockMap.listenersFor('idle')).toHaveLength(0)
        })

        it('should activate the requested mode immediately when the map style is ready', () => {
            const mockMap = createMockMap(true)

            service.startDrawing(DrawInput.Circle, mockMap.map)

            const terraDraw = mockTerraDrawInstances[0]
            expect(terraDraw.start).toHaveBeenCalledTimes(1)
            expect(terraDraw.setMode).toHaveBeenCalledTimes(1)
            expect(terraDraw.setMode).toHaveBeenCalledWith(DrawInput.Circle)
            expect(service.currentDrawModeValue).toBe(DrawInput.Circle)
            expect(mockMap.listenersFor('idle')).toHaveLength(0)
        })

        it('should keep listening for readiness after a transient startup failure', () => {
            jest.spyOn(console, 'warn').mockImplementation(() => {})
            mockStartFailures = 1
            const mockMap = createMockMap(true)

            service.startDrawing(DrawInput.Polygon, mockMap.map)

            const terraDraw = mockTerraDrawInstances[0]
            expect(terraDraw.start).toHaveBeenCalledTimes(1)
            expect(terraDraw.stop).toHaveBeenCalledTimes(1)
            expect(service.currentDrawModeValue).toBeNull()
            expect(mockMap.listenersFor('idle')).toHaveLength(1)

            mockMap.emit('idle')

            expect(terraDraw.start).toHaveBeenCalledTimes(2)
            expect(terraDraw.setMode).toHaveBeenCalledWith(DrawInput.Polygon)
            expect(service.currentDrawModeValue).toBe(DrawInput.Polygon)
            expect(mockMap.listenersFor('idle')).toHaveLength(0)
        })

        it('should attach drawing event handlers before waiting for map readiness', () => {
            const mockMap = createMockMap(false)

            service.startDrawing(DrawInput.Circle, mockMap.map)

            const terraDraw = mockTerraDrawInstances[0]
            expect(terraDraw.listeners.get('finish')).toHaveLength(1)
            expect(terraDraw.listeners.get('change')).toHaveLength(1)
            expect(terraDraw.listeners.get('ready')).toHaveLength(1)
        })
    })

    describe('stopDrawing', () => {
        it('should not activate a pending mode after drawing has been stopped', () => {
            const mockMap = createMockMap(false)
            service.startDrawing(DrawInput.Box, mockMap.map)
            const terraDraw = mockTerraDrawInstances[0]
            const staleReadyListener = terraDraw.listeners.get('ready')![0]

            service.stopDrawing()
            terraDraw.enabled = true
            staleReadyListener()

            expect(terraDraw.setMode).not.toHaveBeenCalled()
            expect(service.currentDrawModeValue).toBeNull()
            expect(service.isDrawingModeValue).toBe(false)
        })
    })

    describe('destroyTerraDrawControl', () => {
        it('should not let readiness from a destroyed control affect its replacement', () => {
            const mockMap = createMockMap(false)
            service.startDrawing(DrawInput.Circle, mockMap.map)
            const firstTerraDraw = mockTerraDrawInstances[0]
            const staleReadyListener = firstTerraDraw.listeners.get('ready')![0]

            service.destroyTerraDrawControl()
            service.startDrawing(DrawInput.Polygon, mockMap.map)
            const replacementTerraDraw = mockTerraDrawInstances[1]

            firstTerraDraw.enabled = true
            staleReadyListener()

            expect(firstTerraDraw.setMode).not.toHaveBeenCalled()
            expect(replacementTerraDraw.setMode).not.toHaveBeenCalled()
            expect(service.currentDrawModeValue).toBeNull()
        })
    })

    describe('activation timeout', () => {
        it('should surface an error and reset drawing state when activation never completes in time', () => {
            jest.spyOn(console, 'error').mockImplementation(() => {})
            const mockMap = createMockMap(false)

            service.startDrawing(DrawInput.Polygon, mockMap.map)

            const terraDraw = mockTerraDrawInstances[0]
            expect(terraDraw.start).not.toHaveBeenCalled()
            expect(service.isDrawingModeValue).toBe(true)
            expect(mockMap.cursor.cursor).toBe('wait')

            jest.advanceTimersByTime(10000)

            expect(mockToastr.error).toHaveBeenCalledTimes(1)
            expect(service.isDrawingModeValue).toBe(false)
            expect(service.currentDrawModeValue).toBeNull()
            expect(mockMap.cursor.cursor).toBe('')
            expect(mockMap.listenersFor('idle')).toHaveLength(0)
        })

        it('should not surface an error once the mode activates before the timeout elapses', () => {
            const mockMap = createMockMap(true)

            service.startDrawing(DrawInput.Circle, mockMap.map)
            expect(service.currentDrawModeValue).toBe(DrawInput.Circle)

            jest.advanceTimersByTime(10000)

            expect(mockToastr.error).not.toHaveBeenCalled()
            expect(service.currentDrawModeValue).toBe(DrawInput.Circle)
            expect(service.isDrawingModeValue).toBe(true)
        })

        it('should not surface an error when drawing is stopped before activation', () => {
            jest.spyOn(console, 'error').mockImplementation(() => {})
            const mockMap = createMockMap(false)

            service.startDrawing(DrawInput.Box, mockMap.map)
            service.stopDrawing()

            jest.advanceTimersByTime(10000)

            expect(mockToastr.error).not.toHaveBeenCalled()
            expect(service.isDrawingModeValue).toBe(false)
        })
    })
})
