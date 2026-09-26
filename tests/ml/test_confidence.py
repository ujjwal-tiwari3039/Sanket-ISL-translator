import unittest
import numpy as np
from ml.src.evaluation.evaluate import threshold_report, confidence_statistics

class ConfidenceTest(unittest.TestCase):
    def test_boundary_matches_browser_strict_greater_than(self):
        report = threshold_report(np.array([0, 0]), np.array([[.4,.3,.3],[.5,.3,.2]]))
        self.assertEqual(report[0]['accepted'], 1)
        self.assertEqual(report[0]['selective_accuracy'], 1.)

    def test_correct_and_incorrect_distributions(self):
        report=confidence_statistics(np.array([0,1]),np.array([[.8,.2],[.7,.3]]))
        self.assertEqual(report['groups']['correct']['confidence']['count'],1)
        self.assertAlmostEqual(report['groups']['incorrect']['margin']['mean'],.4)
        with self.assertRaises(ValueError): confidence_statistics(np.array([0]),np.array([[2.,-1.]]))
