export function validateProjectName(name: string): string | true {
  if (!name) {
    return 'Project name is required';
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    return 'Use lowercase letters, numbers, and hyphens only';
  }

  if (name.length < 2) {
    return 'Project name must be at least 2 characters';
  }

  if (name.length > 50) {
    return 'Project name must be less than 50 characters';
  }

  if (/^[-0-9]/.test(name)) {
    return 'Project name cannot start with a number or hyphen';
  }

  const reserved = ['node_modules', 'dist', 'build', 'public', 'src', 'test', 'tests'];
  if (reserved.includes(name)) {
    return `"${name}" is a reserved name`;
  }

  return true;
}

export function validateEmail(email: string): string | true {
  if (!email) return true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email address';
  }
  return true;
}
