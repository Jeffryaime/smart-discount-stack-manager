// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.matchMedia for Shopify Polaris
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// Mock MediaQueryList for better Polaris compatibility
global.MediaQueryList = class MediaQueryList {
	constructor(query) {
		this.matches = false;
		this.media = query;
		this.onchange = null;
	}

	addListener(listener) {
		// Mock implementation
	}

	removeListener(listener) {
		// Mock implementation
	}

	addEventListener(type, listener) {
		// Mock implementation
	}

	removeEventListener(type, listener) {
		// Mock implementation
	}

	dispatchEvent(event) {
		// Mock implementation
	}
};

// Mock Polaris MediaQueryProvider to avoid the undefined error
jest.mock('@shopify/polaris', () => {
	const originalModule = jest.requireActual('@shopify/polaris');
	return {
		...originalModule,
		MediaQueryProvider: ({ children }) => children,
	};
});

// Mock IntersectionObserver with proper API behavior
// Real API methods return undefined, not null
global.IntersectionObserver = class IntersectionObserver {
	constructor(callback, options) {
		this.callback = callback;
		this.options = options;
		this.observedElements = new Set();
	}

	observe(element) {
		if (element) {
			this.observedElements.add(element);
		}
		// Empty function - does not return anything (undefined)
	}

	disconnect() {
		this.observedElements.clear();
		// Empty function - does not return anything (undefined)
	}

	unobserve(element) {
		if (element) {
			this.observedElements.delete(element);
		}
		// Empty function - does not return anything (undefined)
	}
};

// Mock ResizeObserver with proper API behavior
// Real API methods return undefined, not null
global.ResizeObserver = class ResizeObserver {
	constructor(callback) {
		this.callback = callback;
		this.observedElements = new Set();
	}

	observe(element) {
		if (element) {
			this.observedElements.add(element);
		}
		// Empty function - does not return anything (undefined)
	}

	disconnect() {
		this.observedElements.clear();
		// Empty function - does not return anything (undefined)
	}

	unobserve(element) {
		if (element) {
			this.observedElements.delete(element);
		}
		// Empty function - does not return anything (undefined)
	}
};
