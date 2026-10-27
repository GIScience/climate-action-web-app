import { TestBed } from '@angular/core/testing'
import { DrawInput } from '@app/dashboard/plugin/plugin.interface'
import { TranslocoService } from '@jsverse/transloco'
import { MaplibreTerradrawControl } from '@watergis/maplibre-gl-terradraw'
import type { Map as MaplibreMap } from 'maplibre-gl'
import { ToastrService } from 'ngx-toastr'
import { Mock } from 'vitest'
import { MapDrawingService } from './map-drawing.service'

type MockTerraDrawEvent = 'change' | 'finish' | 'ready'

let mockStartFailures = 0
const mockTerraDrawInstances: MockTerraDrawInstance[] = []

class MockTerraDrawInstance {
    enabled = false
    mode = 'static'
    listeners = new Map<MockTerraDrawEvent, Array<(...args: unknown[]) => void>>()

    start = vi.fn(() => {
        if (mockStartFailures > 0) {
            mockStartFailures--
            this.enabled = true
            throw new Error('Map style is not ready')
        }
        this.enabled = true
    })
    stop = vi.fn(() => {
        this.enabled = false
    })
    getMode = vi.fn(() => this.mode)
    setMode = vi.fn((mode: string) => {
        this.mode = mode
    })
    getSnapshot = vi.fn(() => [])
    removeFeatures = vi.fn()
    on = vi.fn((event: MockTerraDrawEvent, listener: (...args: unknown[]) => void) => {
        const listeners = this.listeners.get(event) ?? []
        listeners.push(listener)
        this.listeners.set(event, listeners)
    })
}

// The real control is constructed (its constructor only stores options; the mocked map never
// calls onAdd). Each control hands out its own mock TerraDraw, recorded in creation order.
const terraDrawByControl = new WeakMap<MaplibreTerradrawControl, MockTerraDrawInstance>()
function mockTerraDrawInstance(this: MaplibreTerradrawControl): MockTerraDrawInstance {
    let terraDraw = terraDrawByControl.get(this)
    if (!terraDraw) {
        terraDraw = new MockTerraDrawInstance()
        terraDrawByControl.set(this, terraDraw)
        mockTerraDrawInstances.push(terraDraw)
    }
    return terraDraw
}

describe('MapDrawingService', () => {
    type MapEvent = 'load' | 'style.load' | 'idle'
    type MockMap = {
        map: MaplibreMap
        cursor: CSSStyleDeclaration
        isStyleLoaded: Mock<() => boolean>
        emit: (event: MapEvent) => void
        listenersFor: (event: MapEvent) => Array<() => void>
    }

    let service: MapDrawingService
    let mockToastr: { error: Mock }

    const createMockMap = (styleLoaded: boolean): MockMap => {
        const listeners = new Map<MapEvent, Set<() => void>>()
        const cursor = {} as CSSStyleDeclaration
        const isStyleLoaded = vi.fn(() => styleLoaded)

        const map = {
            addControl: vi.fn(),
            removeControl: vi.fn(),
            getCanvas: vi.fn(() => ({ style: cursor })),
            isStyleLoaded,
            on: vi.fn((event: MapEvent, listener: () => void) => {
                const eventListeners = listeners.get(event) ?? new Set()
                eventListeners.add(listener)
                listeners.set(event, eventListeners)
            }),
            off: vi.fn((event: MapEvent, listener: () => void) => {
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
        vi.useFakeTimers()
        vi.spyOn(MaplibreTerradrawControl.prototype, 'getTerraDrawInstance').mockImplementation(
            mockTerraDrawInstance as unknown as MaplibreTerradrawControl['getTerraDrawInstance']
        )
        mockTerraDrawInstances.length = 0
        mockStartFailures = 0
        mockToastr = { error: vi.fn() }

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
        vi.restoreAllMocks()
        vi.useRealTimers()
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
            vi.spyOn(console, 'warn').mockImplementation(() => {})
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
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const mockMap = createMockMap(false)

            service.startDrawing(DrawInput.Polygon, mockMap.map)

            const terraDraw = mockTerraDrawInstances[0]
            expect(terraDraw.start).not.toHaveBeenCalled()
            expect(service.isDrawingModeValue).toBe(true)
            expect(mockMap.cursor.cursor).toBe('wait')

            vi.advanceTimersByTime(10000)

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

            vi.advanceTimersByTime(10000)

            expect(mockToastr.error).not.toHaveBeenCalled()
            expect(service.currentDrawModeValue).toBe(DrawInput.Circle)
            expect(service.isDrawingModeValue).toBe(true)
        })

        it('should not surface an error when drawing is stopped before activation', () => {
            vi.spyOn(console, 'error').mockImplementation(() => {})
            const mockMap = createMockMap(false)

            service.startDrawing(DrawInput.Box, mockMap.map)
            service.stopDrawing()

            vi.advanceTimersByTime(10000)

            expect(mockToastr.error).not.toHaveBeenCalled()
            expect(service.isDrawingModeValue).toBe(false)
        })
    })
})
