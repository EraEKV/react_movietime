import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

// Typed once here, so components never repeat RootState / AppDispatch.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
