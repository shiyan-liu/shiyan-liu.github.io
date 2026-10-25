import React from 'react';
import {createRoot} from 'react-dom/client';
import {PublicWordsApp} from './public-words';
createRoot(document.getElementById('root')!).render(<React.StrictMode><PublicWordsApp/></React.StrictMode>);
