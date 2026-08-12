const shadows = {
  none: { elevation: 0, shadowOpacity: 0 },
  soft: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  card: {
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  glowPurple: {
    elevation: 6,
    shadowColor: '#5E6BFF',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  glowOrange: {
    elevation: 6,
    shadowColor: '#FF8A00',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
};

export default shadows;
