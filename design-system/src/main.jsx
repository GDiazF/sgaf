import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './styles/index.css'
import { ShowcaseLayout } from './showcase/ShowcaseLayout.jsx'
import { ShowcaseIndex } from './showcase/pages/Index.jsx'
import { ButtonsPage } from './showcase/pages/Buttons.jsx'
import { FormsPage } from './showcase/pages/Forms.jsx'
import { TablesPage } from './showcase/pages/Tables.jsx'
import { FeedbackPage } from './showcase/pages/Feedback.jsx'
import { PageHeaderPage } from './showcase/pages/PageHeaderDemo.jsx'
import { FiltersPage } from './showcase/pages/Filters.jsx'
import { CrudPage } from './showcase/pages/Crud.jsx'
import { NavigationPage } from './showcase/pages/Navigation.jsx'
import { LoginPage } from './showcase/pages/Login.jsx'
import { StatesPage } from './showcase/pages/States.jsx'
import { IconsPage } from './showcase/pages/Icons.jsx'
import { ChartsPage } from './showcase/pages/Charts.jsx'
import { MotionPage } from './showcase/pages/Motion.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<ShowcaseLayout />}>
          <Route index element={<ShowcaseIndex />} />
          <Route path="buttons" element={<ButtonsPage />} />
          <Route path="forms" element={<FormsPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="page-header" element={<PageHeaderPage />} />
          <Route path="filters" element={<FiltersPage />} />
          <Route path="crud" element={<CrudPage />} />
          <Route path="navigation" element={<NavigationPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="states" element={<StatesPage />} />
          <Route path="icons" element={<IconsPage />} />
          <Route path="charts" element={<ChartsPage />} />
          <Route path="motion" element={<MotionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
