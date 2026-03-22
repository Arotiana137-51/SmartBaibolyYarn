import {__test__transformJesusName} from '../src/contexts/JesusNameContext';

describe('JesusNameContext', () => {
  it('transforms Jesus name variants case-insensitively to canonical casing', () => {
    expect(__test__transformJesusName('Jesosy', 'jesoa')).toBe('Jesoa');
    expect(__test__transformJesusName('JESOSY', 'jesoa')).toBe('Jesoa');
    expect(__test__transformJesusName('JeSoSy', 'jesoa')).toBe('Jesoa');

    expect(__test__transformJesusName('Jesoa', 'jesosy')).toBe('Jesosy');
    expect(__test__transformJesusName('JESOA', 'jesosy')).toBe('Jesosy');
    expect(__test__transformJesusName('JeSoA', 'jesosy')).toBe('Jesosy');
  });

  it('does not replace inside other words', () => {
    expect(__test__transformJesusName('AnaranaJesosyTest', 'jesoa')).toBe('AnaranaJesosyTest');
    expect(__test__transformJesusName('JesosyTest', 'jesoa')).toBe('JesosyTest');
    expect(__test__transformJesusName('TestJesoa', 'jesosy')).toBe('TestJesoa');
  });
});
