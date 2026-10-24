import { mount } from '../src/index.js';
import { KioskApp } from './components/KioskApp.js';

mount(new KioskApp(), document.querySelector('#app'));
