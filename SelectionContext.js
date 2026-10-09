// SelectionContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { AuthContext } from './AuthContext';

const SelectionContext = createContext(null);

const EMPTY = {
  state: 'Maharastra',
  zone: null,
  circle: null,
  division: null,
  area: null,
};

export const SelectionProvider = ({ children }) => {
  const { scope, isAuthenticated } = useContext(AuthContext);

  // Selected values
  const [selectedState, setSelectedState] = useState(EMPTY.state);
  const [selectedZone, setSelectedZone] = useState(EMPTY.zone);
  const [selectedCircle, setSelectedCircle] = useState(EMPTY.circle);
  const [selectedDivision, setSelectedDivision] = useState(EMPTY.division);
  const [selectedArea, setSelectedArea] = useState(EMPTY.area);

  // 🔹 Option lists — stored in context so they SURVIVE SelectionBar remounts
  const [statesList, setStatesList] = useState([]);
  const [zonesList, setZonesList] = useState([]);
  const [circlesList, setCirclesList] = useState([]);
  const [divisionsList, setDivisionsList] = useState([]);
  const [areasList, setAreasList] = useState([]);

  const lastScopeKey = useRef('');
  const wasAuthenticated = useRef(false);

  const lockedState    = scope?.state    || null;
  const lockedZone     = scope?.zone     || null;
  const lockedCircle   = scope?.circle   || null;
  const lockedDivision = scope?.division || null;
  const lockedArea     = scope?.area     || null;

  // Seed from JWT scope (unchanged from previous fix)
  useEffect(() => {
    const isLogout = wasAuthenticated.current && !isAuthenticated;
    wasAuthenticated.current = !!isAuthenticated;

    if (isLogout) {
      setSelectedState(EMPTY.state);
      setSelectedZone(EMPTY.zone);
      setSelectedCircle(EMPTY.circle);
      setSelectedDivision(EMPTY.division);
      setSelectedArea(EMPTY.area);
      setStatesList([]);
      setZonesList([]);
      setCirclesList([]);
      setDivisionsList([]);
      setAreasList([]);
      lastScopeKey.current = '';
      return;
    }

    if (!isAuthenticated || !scope) return;

    const key = JSON.stringify({
      s: scope.state, z: scope.zone, c: scope.circle,
      d: scope.division, a: scope.area,
    });
    if (key === lastScopeKey.current) return;
    lastScopeKey.current = key;

    setSelectedState((prev) => scope.state || prev || EMPTY.state);
    setSelectedZone((prev) => scope.zone ?? prev);
    setSelectedCircle((prev) => scope.circle ?? prev);
    setSelectedDivision((prev) => scope.division ?? prev);
    setSelectedArea((prev) => scope.area ?? prev);
  }, [isAuthenticated, scope]);

  // Reset helpers (unchanged)
  const resetBelowState = useCallback(() => {
    setSelectedZone(null);
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
  }, []);

  const resetBelowZone = useCallback(() => {
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
  }, []);

  const resetBelowCircle = useCallback(() => {
    setSelectedDivision(null);
    setSelectedArea(null);
  }, []);

  const resetBelowDivision = useCallback(() => {
    setSelectedArea(null);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedZone(null);
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
  }, []);

  const value = useMemo(
    () => ({
      // selections
      selectedState, selectedZone, selectedCircle, selectedDivision, selectedArea,
      setSelectedState, setSelectedZone, setSelectedCircle, setSelectedDivision, setSelectedArea,
      // 🔹 option lists (persist across SelectionBar remounts)
      statesList,  setStatesList,
      zonesList,   setZonesList,
      circlesList, setCirclesList,
      divisionsList, setDivisionsList,
      areasList,   setAreasList,
      // helpers
      resetBelowState, resetBelowZone, resetBelowCircle, resetBelowDivision, clearAll,
      // locks
      lockedState, lockedZone, lockedCircle, lockedDivision, lockedArea,
    }),
    [
      selectedState, selectedZone, selectedCircle, selectedDivision, selectedArea,
      statesList, zonesList, circlesList, divisionsList, areasList,
      resetBelowState, resetBelowZone, resetBelowCircle, resetBelowDivision, clearAll,
      lockedState, lockedZone, lockedCircle, lockedDivision, lockedArea,
    ]
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used inside <SelectionProvider>');
  return ctx;
};