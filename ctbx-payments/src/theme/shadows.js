const shadows = {
  none: { elevation: 0, shadowOpacity: 0 },
  soft: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  card: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.17,
    shadowRadius: 18,
  },
  glowPurple: {
    elevation: 6,
    shadowColor: '#5946C8',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  glowOrange: {
    elevation: 6,
    shadowColor: '#F26A21',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  modal: {
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
};

export default shadows;
